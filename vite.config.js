import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const buildVersion = `${Date.now()}`

function versionManifestPlugin() {
  return {
    name: 'wmd-version-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify(
          {
            version: buildVersion,
            builtAt: new Date().toISOString(),
          },
          null,
          2
        ),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(buildVersion),
  },
  plugins: [
    react(),
    versionManifestPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      workbox: {
        cacheId: `wmd-hub-${buildVersion}`,
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Only precache static icons/manifest so HTML/JS/CSS are never stuck in a Cache-First precache
        globPatterns: ['**/*.{png,jpg,jpeg,svg,ico,webmanifest}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.mode === 'navigate' ||
              request.destination === 'document' ||
              request.destination === 'script' ||
              request.destination === 'style',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'wmd-app-runtime',
              networkTimeoutSeconds: 3,
              fetchOptions: {
                cache: 'no-store',
              },
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
            },
          },
        ],
      },
      manifest: {
        name: 'WMD Hub',
        short_name: 'WMD Hub',
        description: 'WMD Hub — West Malayan Portal',
        theme_color: '#09234e',
        background_color: '#f4f6fa',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
})
