import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/global.css';

// Unregister any previously installed service workers and clear old caches
// so mobile and desktop home-screen apps always load the latest deployed version.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    if (registrations.length === 0) return;

    await Promise.all(registrations.map((registration) => registration.unregister()));

    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    if (navigator.serviceWorker.controller) {
      window.location.reload();
    }
  }).catch(() => {
    // Ignore errors in restricted/private browsing contexts
  });
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
