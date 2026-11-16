import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/global.css';

if ('serviceWorker' in navigator) {
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      if (!registration) return;

      const checkForUpdate = async () => {
        if (registration.installing || !navigator.onLine) return;
        try {
          const resp = await fetch(swUrl, {
            cache: 'no-store',
            headers: {
              cache: 'no-store',
              'cache-control': 'no-cache',
            },
          });
          if (resp.status === 200) {
            await registration.update();
          }
        } catch {
          // Ignore network errors while offline or switching networks
        }
      };

      // Check when the user switches back to the PWA or regains connectivity
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          void checkForUpdate();
        }
      });
      window.addEventListener('online', () => {
        void checkForUpdate();
      });

      // Also poll periodically while the app stays open
      setInterval(() => {
        void checkForUpdate();
      }, 15 * 60 * 1000);
    },
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
