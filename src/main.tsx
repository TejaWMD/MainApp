import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/global.css';

let isReloading = false;

async function forceFreshReload(targetVersion?: string) {
  if (isReloading) return;
  if (targetVersion) {
    const lastReloaded = sessionStorage.getItem('wmd_reloaded_version');
    if (lastReloaded === targetVersion) return;
    sessionStorage.setItem('wmd_reloaded_version', targetVersion);
  }
  isReloading = true;

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    }
    // Force browser HTTP cache to update the document before reloading (crucial on iOS & Android)
    await fetch(window.location.href.split('#')[0], {
      cache: 'reload',
      headers: {
        pragma: 'no-cache',
        'cache-control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch {
    // Ignore network errors during cache warm-up
  }

  window.location.reload();
}

async function checkRemoteVersion() {
  if (!navigator.onLine || isReloading) return;

  try {
    const versionUrl = new URL('./version.json', window.location.href);
    versionUrl.searchParams.set('_t', String(Date.now()));

    const response = await fetch(versionUrl.toString(), {
      cache: 'no-store',
      headers: {
        pragma: 'no-cache',
        'cache-control': 'no-cache, no-store, must-revalidate',
      },
    });

    if (!response.ok) return;
    const data = (await response.json()) as { version?: string };

    if (data?.version && data.version !== __APP_VERSION__) {
      await forceFreshReload(data.version);
    }
  } catch {
    // Ignore errors when offline or during local dev where version.json isn't emitted
  }
}

if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || isReloading) return;
    void forceFreshReload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      const triggerUpdateCheck = async () => {
        if (!navigator.onLine || isReloading) return;
        await checkRemoteVersion();
        if (!registration || registration.installing) return;
        try {
          const resp = await fetch(`${swUrl}?_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              pragma: 'no-cache',
              'cache-control': 'no-cache, no-store, must-revalidate',
            },
          });
          if (resp.status === 200) {
            await registration.update();
          }
        } catch {
          // Ignore network errors while offline
        }
      };

      void triggerUpdateCheck();

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void triggerUpdateCheck();
        }
      });
      window.addEventListener('focus', () => {
        void triggerUpdateCheck();
      });
      window.addEventListener('pageshow', () => {
        void triggerUpdateCheck();
      });
      window.addEventListener('online', () => {
        void triggerUpdateCheck();
      });

      setInterval(() => {
        void triggerUpdateCheck();
      }, 60 * 1000);
    },
  });
} else {
  // Fallback for environments without Service Worker support
  void checkRemoteVersion();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void checkRemoteVersion();
    }
  });
  window.addEventListener('focus', () => {
    void checkRemoteVersion();
  });
  setInterval(() => {
    void checkRemoteVersion();
  }, 60 * 1000);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
