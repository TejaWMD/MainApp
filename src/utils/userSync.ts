import { supabase } from '../config/supabaseClient';
import { User, UserSyncResponse } from '../types';

async function invokeSyncFunction(
  actor: Pick<User, 'id' | 'email'>,
  body: Record<string, unknown>
): Promise<UserSyncResponse> {
  const { data, error } = await supabase.functions.invoke('sync-user-access', {
    body: {
      actor: {
        id: actor.id,
        email: actor.email,
      },
      ...body,
    },
  });

  if (error) {
    let message = error.message || 'Failed to reach backend sync function.';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) {
        const parsed = await ctx.json();
        if (parsed?.error) message = parsed.error;
      }
    } catch {
      // ignore json parse failure
    }
    return { ok: false, error: message };
  }

  if (!data || data.error) {
    return { ok: false, error: data?.error || 'Unknown backend sync error.' };
  }

  return data as UserSyncResponse;
}

export async function upsertUserAndSync(
  actor: Pick<User, 'id' | 'email'>,
  user: User
): Promise<UserSyncResponse> {
  return invokeSyncFunction(actor, {
    action: 'upsert_user',
    user,
  });
}

export async function toggleUserStatusAndSync(
  actor: Pick<User, 'id' | 'email'>,
  userId: string
): Promise<UserSyncResponse> {
  return invokeSyncFunction(actor, {
    action: 'toggle_status',
    userId,
  });
}

export async function resyncUserToApps(
  actor: Pick<User, 'id' | 'email'>,
  userId: string
): Promise<UserSyncResponse> {
  return invokeSyncFunction(actor, {
    action: 'resync_user',
    userId,
  });
}
