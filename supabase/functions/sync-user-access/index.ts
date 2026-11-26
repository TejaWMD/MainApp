// Supabase Edge Function: sync-user-access
// Deploy on MainApp Supabase project (omkpwhlvidwyhdivqpoe)
//
// Safely creates/updates users in MainApp and syncs them to each granted child
// website's Supabase database using server-side service-role keys.
// NEVER deletes rows from child databases to protect historical data (especially ManagerDashboard).

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const TEAM_ACCESS_OWNER_EMAIL = 'wmgteja@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Role = 'admin' | 'manager' | 'account_manager' | 'staff';

interface UserInput {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  role_label?: string;
  department: string;
  avatar_initials?: string;
  phone?: string | null;
  status?: 'Active' | 'Inactive';
  accessible_apps?: string[];
}

interface ActorInput {
  id: string;
  email: string;
}

interface SyncStepResult {
  ok: boolean;
  action: 'synced' | 'deactivated' | 'skipped' | 'sso_only' | 'error';
  message: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'WM';
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
}

function defaultRoleLabel(role: Role): string {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager';
    case 'account_manager':
      return 'Account Manager';
    default:
      return 'Staff';
  }
}

function normalizeAccessibleApps(role: Role, rawApps?: string[]): string[] {
  if (role === 'admin') {
    return ['manager', 'purchase', 'sales', 'qaqc'];
  }
  const normalized = Array.from(
    new Set(
      (Array.isArray(rawApps) ? rawApps : [])
        .map((a) => (a === 'prediction' ? 'purchase' : String(a).trim().toLowerCase()))
        .filter((a) => ['manager', 'purchase', 'sales', 'qaqc'].includes(a))
    )
  );
  // ManagerDashboard (Query Portal) is strictly not for staff
  if (role === 'staff') {
    return normalized.filter((a) => a !== 'manager');
  }
  return normalized;
}

function createServiceClient(urlEnv: string, keyEnv: string): SupabaseClient | null {
  const url = Deno.env.get(urlEnv)?.trim();
  const key = Deno.env.get(keyEnv)?.trim();
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function syncToManagerDashboard(
  user: Required<Pick<UserInput, 'id' | 'name' | 'email' | 'role' | 'role_label' | 'department' | 'avatar_initials' | 'status' | 'accessible_apps'>> & {
    password?: string;
    phone?: string | null;
  }
): Promise<SyncStepResult> {
  const client = createServiceClient('MANAGER_SUPABASE_URL', 'MANAGER_SUPABASE_SERVICE_ROLE_KEY');
  if (!client) {
    return { ok: false, action: 'error', message: 'ManagerDashboard secrets not configured' };
  }

  const hasAccess = user.role === 'admin' || user.accessible_apps.includes('manager');
  const isAllowedRole = user.role === 'admin' || user.role === 'manager' || user.role === 'account_manager';

  if (hasAccess && user.status === 'Active') {
    if (!isAllowedRole) {
      return {
        ok: true,
        action: 'skipped',
        message: 'Staff role is not permitted on Query Portal',
      };
    }

    const fullRow: Record<string, unknown> = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      role_label: user.role_label,
      avatar_initials: user.avatar_initials,
      phone: user.phone || null,
      department: user.department,
      password: user.password || null,
      status: 'Active',
      updated_at: new Date().toISOString(),
    };

    const { error } = await client.from('users').upsert(fullRow, { onConflict: 'id' });
    if (!error) {
      return { ok: true, action: 'synced', message: 'Synced to Query Portal' };
    }

    // Fallback if optional columns (department/password/status/updated_at) haven't been migrated yet
    if (error.message.includes('column') || error.code === 'PGRST204') {
      const baseRow = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        role_label: user.role_label,
        avatar_initials: user.avatar_initials,
        phone: user.phone || null,
      };
      const { error: fallbackErr } = await client.from('users').upsert(baseRow, { onConflict: 'id' });
      if (!fallbackErr) {
        return {
          ok: true,
          action: 'synced',
          message: 'Synced core profile to Query Portal (run optional column migration to also store dept/password/status)',
        };
      }
      return { ok: false, action: 'error', message: fallbackErr.message };
    }

    return { ok: false, action: 'error', message: error.message };
  }

  // Revoked or Inactive: NEVER delete rows in ManagerDashboard (protects queries & audit history).
  // If user already exists, only mark status = 'Inactive' if the column exists.
  const { data: existing } = await client
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    return { ok: true, action: 'skipped', message: 'No access granted; not added to Query Portal' };
  }

  const { error: deactivateErr } = await client
    .from('users')
    .update({ status: 'Inactive', updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (deactivateErr && !(deactivateErr.message.includes('column') || deactivateErr.code === 'PGRST204')) {
    return { ok: false, action: 'error', message: deactivateErr.message };
  }

  return {
    ok: true,
    action: 'deactivated',
    message: 'Access disabled in Hub; existing Query Portal record preserved (not deleted)',
  };
}

async function syncToQaqcWeb(
  user: Required<Pick<UserInput, 'id' | 'name' | 'email' | 'role' | 'role_label' | 'department' | 'avatar_initials' | 'status' | 'accessible_apps'>> & {
    password?: string;
  }
): Promise<SyncStepResult> {
  const client = createServiceClient('QAQC_SUPABASE_URL', 'QAQC_SUPABASE_SERVICE_ROLE_KEY');
  if (!client) {
    return { ok: false, action: 'error', message: 'Factory (QAQC) secrets not configured' };
  }

  const hasAccess = user.role === 'admin' || user.accessible_apps.includes('qaqc');
  const qaqcRole = user.role === 'admin' ? 'admin' : 'staff';

  // Match by id first, then by email (handles legacy QAQC IDs cleanly without violating unique email index)
  const { data: byId } = await client.from('users').select('id').eq('id', user.id).maybeSingle();
  let existingId: string | null = byId?.id ?? null;

  if (!existingId) {
    const { data: byEmail } = await client
      .from('users')
      .select('id')
      .ilike('email', user.email)
      .eq('deleted', false)
      .maybeSingle();
    existingId = byEmail?.id ?? null;
  }

  if (hasAccess && user.status === 'Active') {
    if (existingId) {
      // IMPORTANT: Never overwrite `permissions` on update so per-person QAQC permissions stay intact
      const updatePayload: Record<string, unknown> = {
        name: user.name,
        email: user.email,
        role: qaqcRole,
        role_label: user.role_label,
        dept: user.department,
        avatar_initials: user.avatar_initials,
        status: 'active',
        deleted: false,
        updated_at: new Date().toISOString(),
      };
      if (user.password) {
        updatePayload.password = user.password;
      }
      const { error } = await client.from('users').update(updatePayload).eq('id', existingId);
      if (error) return { ok: false, action: 'error', message: error.message };
      return {
        ok: true,
        action: 'synced',
        message: 'Updated in Factory (QAQC) (existing module permissions preserved)',
      };
    }

    const { error } = await client.from('users').insert({
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password || '',
      role: qaqcRole,
      role_label: user.role_label,
      dept: user.department,
      avatar_initials: user.avatar_initials,
      permissions: [],
      status: 'active',
      deleted: false,
    });
    if (error) return { ok: false, action: 'error', message: error.message };
    return {
      ok: true,
      action: 'synced',
      message: 'Added to Factory (QAQC) (configure per-person permissions inside Factory QAQC)',
    };
  }

  if (!existingId) {
    return { ok: true, action: 'skipped', message: 'No access granted; not added to Factory (QAQC)' };
  }

  const { error } = await client
    .from('users')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', existingId);

  if (error) return { ok: false, action: 'error', message: error.message };
  return {
    ok: true,
    action: 'deactivated',
    message: 'Marked suspended in Factory (QAQC) (record & permissions preserved)',
  };
}

async function syncToPurchase(
  user: Required<Pick<UserInput, 'id' | 'name' | 'email' | 'role' | 'role_label' | 'department' | 'avatar_initials' | 'status' | 'accessible_apps'>> & {
    password?: string;
    phone?: string | null;
  }
): Promise<SyncStepResult> {
  const client = createServiceClient('PURCHASE_SUPABASE_URL', 'PURCHASE_SUPABASE_SERVICE_ROLE_KEY');
  if (!client) {
    return { ok: false, action: 'error', message: 'Purchase secrets not configured' };
  }

  const hasAccess = user.role === 'admin' || user.accessible_apps.includes('purchase');

  if (hasAccess && user.status === 'Active') {
    const { error } = await client.from('users').upsert(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        password: user.password || null,
        role: user.role,
        role_label: user.role_label,
        department: user.department,
        avatar_initials: user.avatar_initials,
        phone: user.phone || null,
        status: 'Active',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) return { ok: false, action: 'error', message: error.message };
    return { ok: true, action: 'synced', message: 'Synced to Purchase' };
  }

  const { data: existing } = await client
    .from('users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    return { ok: true, action: 'skipped', message: 'No access granted; not added to Purchase' };
  }

  const { error } = await client
    .from('users')
    .update({ status: 'Inactive', updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return { ok: false, action: 'error', message: error.message };
  return { ok: true, action: 'deactivated', message: 'Marked Inactive in Purchase' };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const mainSupabase = createServiceClient('SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
    if (!mainSupabase) {
      return jsonResponse({ error: 'MainApp server credentials not configured' }, 500);
    }

    const payload = await req.json();
    const action = String(payload?.action || 'upsert_user');
    const actor = payload?.actor as ActorInput | undefined;

    if (!actor?.id || !actor?.email) {
      return jsonResponse({ error: 'Unauthorized: missing admin identity' }, 401);
    }

    // Verify caller is specifically Teja's active Admin account in MainApp
    const { data: adminRow, error: adminErr } = await mainSupabase
      .from('users')
      .select('id, email, role, status')
      .eq('id', actor.id)
      .ilike('email', actor.email.trim().toLowerCase())
      .maybeSingle();

    if (
      adminErr ||
      !adminRow ||
      adminRow.role !== 'admin' ||
      adminRow.status !== 'Active' ||
      String(adminRow.email || '').trim().toLowerCase() !== TEAM_ACCESS_OWNER_EMAIL
    ) {
      return jsonResponse({ error: 'Forbidden: Team & Access is restricted to Teja only' }, 403);
    }

    let targetUser:
      | (Required<Pick<UserInput, 'id' | 'name' | 'email' | 'role' | 'role_label' | 'department' | 'avatar_initials' | 'status' | 'accessible_apps'>> & {
          password?: string;
          phone?: string | null;
        })
      | null = null;

    if (action === 'upsert_user') {
      const input = payload?.user as UserInput | undefined;
      if (!input?.id || !input?.name || !input?.email || !input?.role || !input?.department) {
        return jsonResponse({ error: 'Missing required user fields (id, name, email, role, department)' }, 400);
      }

      const cleanId = input.id.trim();
      const cleanName = input.name.trim();
      const cleanEmail = input.email.trim().toLowerCase();
      const cleanRole = input.role;
      const cleanStatus: 'Active' | 'Inactive' = input.status === 'Inactive' ? 'Inactive' : 'Active';
      const cleanApps = normalizeAccessibleApps(cleanRole, input.accessible_apps);

      // Keep existing password if editing without changing password
      let effectivePassword = input.password?.trim() || '';
      if (!effectivePassword) {
        const { data: existingMain } = await mainSupabase
          .from('users')
          .select('password')
          .eq('id', cleanId)
          .maybeSingle();
        effectivePassword = existingMain?.password || '';
      }

      if (!effectivePassword) {
        return jsonResponse({ error: 'Password is required for new users' }, 400);
      }

      targetUser = {
        id: cleanId,
        name: cleanName,
        email: cleanEmail,
        password: effectivePassword,
        role: cleanRole,
        role_label: input.role_label?.trim() || defaultRoleLabel(cleanRole),
        department: input.department.trim(),
        avatar_initials: input.avatar_initials?.trim() || computeInitials(cleanName),
        phone: input.phone ? input.phone.trim() : null,
        status: cleanStatus,
        accessible_apps: cleanApps,
      };

      const { error: mainErr } = await mainSupabase.from('users').upsert(
        {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          password: targetUser.password,
          role: targetUser.role,
          role_label: targetUser.role_label,
          department: targetUser.department,
          avatar_initials: targetUser.avatar_initials,
          phone: targetUser.phone,
          status: targetUser.status,
          accessible_apps: targetUser.accessible_apps,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

      if (mainErr) {
        return jsonResponse({ error: `MainApp save failed: ${mainErr.message}` }, 400);
      }
    } else if (action === 'toggle_status' || action === 'resync_user') {
      const userId = String(payload?.userId || '').trim();
      if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);

      const { data: existing, error: fetchErr } = await mainSupabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchErr || !existing) {
        return jsonResponse({ error: 'User not found in MainApp' }, 404);
      }

      const nextStatus: 'Active' | 'Inactive' =
        action === 'toggle_status'
          ? existing.status === 'Active'
            ? 'Inactive'
            : 'Active'
          : existing.status === 'Inactive'
            ? 'Inactive'
            : 'Active';

      if (action === 'toggle_status') {
        const { error: updErr } = await mainSupabase
          .from('users')
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq('id', userId);
        if (updErr) {
          return jsonResponse({ error: `MainApp status update failed: ${updErr.message}` }, 400);
        }
      }

      targetUser = {
        id: existing.id,
        name: existing.name,
        email: String(existing.email || '').trim().toLowerCase(),
        password: existing.password || undefined,
        role: existing.role as Role,
        role_label: existing.role_label || defaultRoleLabel(existing.role as Role),
        department: existing.department || 'All',
        avatar_initials: existing.avatar_initials || computeInitials(existing.name || 'WM'),
        phone: existing.phone || null,
        status: nextStatus,
        accessible_apps: normalizeAccessibleApps(existing.role as Role, existing.accessible_apps),
      };
    } else {
      return jsonResponse({ error: `Unsupported action: ${action}` }, 400);
    }

    // Fan out child website syncs in parallel
    const [managerRes, qaqcRes, purchaseRes] = await Promise.all([
      syncToManagerDashboard(targetUser),
      syncToQaqcWeb(targetUser),
      syncToPurchase(targetUser),
    ]);

    const salesHasAccess = targetUser.role === 'admin' || targetUser.accessible_apps.includes('sales');
    const salesRes: SyncStepResult = {
      ok: true,
      action: 'sso_only',
      message: salesHasAccess && targetUser.status === 'Active'
        ? 'Enabled via MainApp SSO'
        : 'Disabled in MainApp Hub',
    };

    const results = {
      mainapp: { ok: true, action: 'synced', message: 'Saved in MainApp' } as SyncStepResult,
      manager: managerRes,
      qaqc: qaqcRes,
      purchase: purchaseRes,
      sales: salesRes,
    };

    return jsonResponse({
      ok: true,
      user: targetUser,
      results,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error';
    return jsonResponse({ error: message }, 500);
  }
});
