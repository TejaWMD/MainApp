import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

interface SwClient {
  url: string;
  focus?: () => Promise<SwClient>;
  postMessage: (message: unknown) => void;
}

interface SwExtendableEvent extends Event {
  waitUntil: (promise: Promise<unknown>) => void;
}

interface SwPushEvent extends SwExtendableEvent {
  data?: {
    json: () => Record<string, unknown>;
    text: () => string;
  };
}

interface SwNotificationEvent extends SwExtendableEvent {
  action: string;
  notification: Notification & { data?: Record<string, unknown> };
}

interface SwGlobal {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
  skipWaiting: () => Promise<void>;
  registration: ServiceWorkerRegistration;
  clients: {
    claim: () => Promise<void>;
    matchAll: (options?: { type?: string; includeUncontrolled?: boolean }) => Promise<SwClient[]>;
    openWindow?: (url: string) => Promise<SwClient | null>;
  };
  addEventListener: (type: string, listener: (event: any) => void) => void;
}

const sw = globalThis as unknown as SwGlobal;

const MANAGER_SUPABASE_URL = 'https://mjrqamakqqsqqmuvaqpw.supabase.co';
const MANAGER_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qcnFhbWFrcXFzcXFtdXZhcXB3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI0NjQyOTgsImV4cCI6MjEwODA0MDI5OH0.5VWlGTl87khT4JHlLLoT8IAwmceToyNZcN2EjfDohKg';

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute((self as unknown as SwGlobal).__WB_MANIFEST);

registerRoute(
  ({ request }) =>
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.destination === 'script' ||
    request.destination === 'style',
  new NetworkFirst({
    cacheName: 'wmd-app-runtime',
    networkTimeoutSeconds: 3,
    fetchOptions: {
      cache: 'no-store',
    },
    plugins: [
      new ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 7 * 24 * 60 * 60,
      }),
    ],
  })
);

sw.addEventListener('install', () => {
  void sw.skipWaiting();
});

sw.addEventListener('message', (event: MessageEvent) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void sw.skipWaiting();
  }
});

async function shouldSuppressUrgentNotification(
  title: unknown,
  tag: unknown,
  data: Record<string, unknown> | undefined
): Promise<boolean> {
  try {
    const titleStr = String(title || '');
    const tagStr = String(tag || '').toLowerCase();
    const eventStr = String((data && data.event) || '').toUpperCase();

    const isUrgentReminder =
      eventStr === 'URGENT_REMINDER' ||
      tagStr.includes('urgent_reminder') ||
      titleStr.includes('Urgent Query Alert') ||
      titleStr.includes('URGENT Warning');

    if (!isUrgentReminder) {
      return false;
    }

    const rawQueryId =
      (data && data.queryId) ||
      (titleStr.match(/QRY-\d+/i) && titleStr.match(/QRY-\d+/i)![0]) ||
      (tagStr.match(/qry-\d+/i) && tagStr.match(/qry-\d+/i)![0]);

    if (!rawQueryId) {
      return false;
    }

    const normId = String(rawQueryId).trim().toUpperCase();
    const url = `${MANAGER_SUPABASE_URL}/rest/v1/queries?query_id=ilike.${encodeURIComponent(
      normId
    )}&select=query_id,status,manager_done,account_manager_done,completed_at,completed_at_ms,is_urgent`;

    const res = await fetch(url, {
      headers: {
        apikey: MANAGER_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${MANAGER_SUPABASE_ANON_KEY}`,
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const rows = (await res.json()) as Array<Record<string, unknown>>;
      const row = Array.isArray(rows) ? rows[0] : null;
      if (row) {
        const statusLower = String(row.status || '').trim().toLowerCase();
        const isResolved =
          Boolean(row.manager_done) ||
          Boolean(row.account_manager_done) ||
          statusLower === 'completed' ||
          statusLower === 'done' ||
          Boolean(row.completed_at) ||
          Boolean(row.completed_at_ms) ||
          row.is_urgent === false;

        if (isResolved) {
          return true;
        }
      }
    }
  } catch {
    // Non-blocking fallback
  }
  return false;
}

sw.addEventListener('push', (event: SwPushEvent) => {
  const defaultIcon = new URL('pwa-192x192.png', sw.registration.scope).href;

  let payload: Record<string, any> = {
    title: 'WMD Hub',
    body: 'New notification received',
    icon: defaultIcon,
    badge: defaultIcon,
    tag: `wmd-alert-${Date.now()}`,
    data: { appId: 'manager' },
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      payload = { ...payload, ...parsed };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const incomingData =
    typeof payload.data === 'object' && payload.data
      ? (payload.data as Record<string, unknown>)
      : {};
  const targetAppId = String(incomingData.appId || 'manager').trim() || 'manager';
  const openActionTitle = targetAppId === 'qaqc' ? 'Open QAQC Web' : 'Open Portal';

  const notificationOptions: NotificationOptions & {
    vibrate?: number[];
    renotify?: boolean;
    actions?: Array<{ action: string; title: string }>;
  } = {
    body: String(payload.body || ''),
    icon: defaultIcon,
    badge: defaultIcon,
    tag: String(payload.tag || `wmd-alert-${Date.now()}`),
    data: {
      ...incomingData,
      appId: targetAppId,
    },
    vibrate: [250, 100, 250, 100, 250],
    requireInteraction: true,
    renotify: true,
    silent: false,
    actions: [
      { action: 'open', title: openActionTitle },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    (async () => {
      if (targetAppId === 'manager') {
        const suppress = await shouldSuppressUrgentNotification(
          payload.title,
          notificationOptions.tag,
          notificationOptions.data as Record<string, unknown> | undefined
        );
        if (suppress) return;
      }

      await sw.registration.showNotification(
        String(payload.title || 'WMD Hub'),
        notificationOptions
      );
    })()
  );
});

sw.addEventListener('notificationclick', (event: SwNotificationEvent) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notifData = (event.notification.data || {}) as Record<string, unknown>;
  const targetAppId = String(notifData.appId || 'manager').trim() || 'manager';
  const targetPath = typeof notifData.path === 'string' ? notifData.path.trim() : '';

  const launchParams = new URLSearchParams({ app: targetAppId });
  if (targetPath) {
    launchParams.set('path', targetPath);
  }
  const launchUrl = new URL(`./?${launchParams.toString()}`, sw.registration.scope).href;

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.focus) {
            client.postMessage({
              type: 'WMD_OPEN_APP_FROM_NOTIFICATION',
              appId: targetAppId,
              path: targetPath || undefined,
              data: notifData,
            });
            return client.focus();
          }
        }
        if (sw.clients.openWindow) {
          return sw.clients.openWindow(launchUrl);
        }
        return undefined;
      })
  );
});
