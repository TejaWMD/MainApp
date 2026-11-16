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
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: false,
      injectManifest: {
        // Only precache static icons/manifest so HTML/JS/CSS are never stuck in a Cache-First precache
        globPatterns: ['**/*.{png,jpg,jpeg,svg,ico,webmanifest}'],
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
