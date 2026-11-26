import { createClient } from '@supabase/supabase-js';

const MANAGER_SUPABASE_URL = 'https://mjrqamakqqsqqmuvaqpw.supabase.co';
const MANAGER_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnFhbWFrcXFzcXFtdXZhcXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NjQyOTgsImV4cCI6MjEwODA0MDI5OH0.5VWlGTl87khT4JHlLLoT8IAwmceToyNZcN2EjfDohKg';

const QAQC_SUPABASE_URL = 'https://mfeojzfaeyctdtgwldem.supabase.co';
const QAQC_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mZW9qemZhZXljdGR0Z3dsZGVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ4NzgwNTksImV4cCI6MjExMDQ1NDA1OX0.M07IpoxwWEJiFZiPMPzLlfn0vR8hclPzrB7iceFS1t8';

const VAPID_PUBLIC_KEY =
  'BCEB9PkPPBOooUYwvmg1UZalOVO10DVdzsdCcKAoHFyARTSRsSjFogXcLzF0KSbLv6Z4IW548ttA0vCBfmMExqI';

const managerSupabase = createClient(MANAGER_SUPABASE_URL, MANAGER_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

const qaqcSupabase = createClient(QAQC_SUPABASE_URL, QAQC_SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

export interface PushTargetContext {
  userId: string;
  userEmail: string;
  hasManagerAccess: boolean;
  hasQaqcAccess: boolean;
}

export interface PushStatus {
  supported: boolean;
  needsIosInstall: boolean;
  permission: NotificationPermission | 'unsupported';
  isSubscribed: boolean;
}

export function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function encodeSubscriptionKey(sub: PushSubscription, keyName: 'p256dh' | 'auth'): string {
  const raw = sub.getKey ? sub.getKey(keyName) : null;
  if (!raw) return '';
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready);
  } catch {
    return null;
  }
}

async function saveSubscriptionToManagerDb(
  userId: string,
  sub: PushSubscription
): Promise<{ ok: boolean; error?: string }> {
  const p256dh = encodeSubscriptionKey(sub, 'p256dh');
  const auth = encodeSubscriptionKey(sub, 'auth');

  const { error: upsertError } = await managerSupabase
    .from('push_subscriptions')
    .upsert(
      {
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh,
        auth,
      },
      { onConflict: 'user_id,endpoint' }
    );

  if (!upsertError) {
    return { ok: true };
  }

  await managerSupabase
    .from('push_subscriptions')
    .delete()
    .match({ user_id: userId, endpoint: sub.endpoint });

  const { error: insertError } = await managerSupabase
    .from('push_subscriptions')
    .insert([{ user_id: userId, endpoint: sub.endpoint, p256dh, auth }]);

  if (insertError) {
    return { ok: false, error: insertError.message || upsertError.message };
  }

  return { ok: true };
}

async function saveSubscriptionToQaqcDb(
  userId: string,
  userEmail: string,
  sub: PushSubscription
): Promise<{ ok: boolean; error?: string }> {
  const cleanEmail = String(userEmail || '').trim().toLowerCase();
  if (!cleanEmail) return { ok: false, error: 'Missing user email' };

  const p256dh = encodeSubscriptionKey(sub, 'p256dh');
  const auth = encodeSubscriptionKey(sub, 'auth');

  const { error: upsertError } = await qaqcSupabase
    .from('qaqc_push_subscriptions')
    .upsert(
      {
        user_email: cleanEmail,
        user_id: userId,
        endpoint: sub.endpoint,
        p256dh,
        auth,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_email,endpoint' }
    );

  if (!upsertError) {
    return { ok: true };
  }

  await qaqcSupabase
    .from('qaqc_push_subscriptions')
    .delete()
    .match({ user_email: cleanEmail, endpoint: sub.endpoint });

  const { error: insertError } = await qaqcSupabase
    .from('qaqc_push_subscriptions')
    .insert([{ user_email: cleanEmail, user_id: userId, endpoint: sub.endpoint, p256dh, auth }]);

  if (insertError) {
    return { ok: false, error: insertError.message || upsertError.message };
  }

  return { ok: true };
}

async function saveSubscriptionsForTargets(
  ctx: PushTargetContext,
  sub: PushSubscription
): Promise<{ ok: boolean; error?: string }> {
  const results: Array<{ app: string; ok: boolean; error?: string }> = [];

  if (ctx.hasManagerAccess) {
    const res = await saveSubscriptionToManagerDb(ctx.userId, sub);
    results.push({ app: 'ManagerDashboard', ...res });
  }

  if (ctx.hasQaqcAccess) {
    const res = await saveSubscriptionToQaqcDb(ctx.userId, ctx.userEmail, sub);
    results.push({ app: 'QAQCWeb', ...res });
  }

  if (results.length === 0) {
    return { ok: true };
  }

  const anySuccess = results.some((r) => r.ok);
  const errors = results.filter((r) => !r.ok).map((r) => `${r.app}: ${r.error}`);

  if (anySuccess) {
    return { ok: true };
  }

  return { ok: false, error: errors.join('; ') };
}

export async function getPushStatus(ctx: PushTargetContext): Promise<PushStatus> {
  const ios = isIosDevice();
  const standalone = isStandalonePwa();

  if (ios && !standalone) {
    return {
      supported: false,
      needsIosInstall: true,
      permission: 'unsupported',
      isSubscribed: false,
    };
  }

  if (!isPushSupported()) {
    return {
      supported: false,
      needsIosInstall: false,
      permission: 'unsupported',
      isSubscribed: false,
    };
  }

  const permission = Notification.permission;
  const reg = await getSwRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;

  if (!sub || permission !== 'granted') {
    return {
      supported: true,
      needsIosInstall: false,
      permission,
      isSubscribed: false,
    };
  }

  // Silently ensure this device's push endpoint is registered in each app's own DB
  if (ctx.hasManagerAccess) {
    try {
      const { data, error } = await managerSupabase
        .from('push_subscriptions')
        .select('endpoint')
        .eq('user_id', ctx.userId);

      const hasEndpoint =
        !error && Array.isArray(data) && data.some((row) => row.endpoint === sub.endpoint);

      if (!hasEndpoint) {
        await saveSubscriptionToManagerDb(ctx.userId, sub);
      }
    } catch {
      // Non-blocking sync
    }
  }

  if (ctx.hasQaqcAccess && ctx.userEmail) {
    try {
      const cleanEmail = ctx.userEmail.trim().toLowerCase();
      const { data, error } = await qaqcSupabase
        .from('qaqc_push_subscriptions')
        .select('endpoint')
        .eq('user_email', cleanEmail);

      const hasEndpoint =
        !error && Array.isArray(data) && data.some((row) => row.endpoint === sub.endpoint);

      if (!hasEndpoint) {
        await saveSubscriptionToQaqcDb(ctx.userId, cleanEmail, sub);
      }
    } catch {
      // Non-blocking sync
    }
  }

  return {
    supported: true,
    needsIosInstall: false,
    permission,
    isSubscribed: true,
  };
}

export async function enablePushNotifications(
  ctx: PushTargetContext
): Promise<{ ok: boolean; status: PushStatus; message?: string }> {
  if (isIosDevice() && !isStandalonePwa()) {
    return {
      ok: false,
      status: await getPushStatus(ctx),
      message: 'On iPhone/iPad, tap Share -> Add to Home Screen first, then open WMD Hub from your Home Screen.',
    };
  }

  if (!isPushSupported()) {
    return {
      ok: false,
      status: await getPushStatus(ctx),
      message: 'Push notifications are not supported in this browser (HTTPS required).',
    };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return {
      ok: false,
      status: await getPushStatus(ctx),
      message:
        permission === 'denied'
          ? 'Notifications are blocked in your browser/device settings.'
          : 'Notification permission was dismissed.',
    };
  }

  const reg = await getSwRegistration();
  if (!reg) {
    return {
      ok: false,
      status: await getPushStatus(ctx),
      message: 'Service Worker is not ready yet. Please reload and try again.',
    };
  }

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }

  const saved = await saveSubscriptionsForTargets(ctx, sub);
  const status = await getPushStatus(ctx);

  if (!saved.ok) {
    return {
      ok: false,
      status,
      message: `Permission granted, but failed to save subscription: ${saved.error}`,
    };
  }

  return { ok: true, status };
}

export async function disablePushNotifications(
  ctx: PushTargetContext
): Promise<{ ok: boolean; status: PushStatus }> {
  const reg = await getSwRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;

  if (sub) {
    if (ctx.hasManagerAccess) {
      try {
        await managerSupabase
          .from('push_subscriptions')
          .delete()
          .match({ user_id: ctx.userId, endpoint: sub.endpoint });
      } catch {
        // Ignore DB delete error
      }
    }
    if (ctx.hasQaqcAccess && ctx.userEmail) {
      try {
        await qaqcSupabase
          .from('qaqc_push_subscriptions')
          .delete()
          .match({ user_email: ctx.userEmail.trim().toLowerCase(), endpoint: sub.endpoint });
      } catch {
        // Ignore DB delete error
      }
    }
    try {
      await sub.unsubscribe();
    } catch {
      // Ignore browser unsubscribe error
    }
  }

  return { ok: true, status: await getPushStatus(ctx) };
}
