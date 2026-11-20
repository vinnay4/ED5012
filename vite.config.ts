import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'

const mediapipeVersion = JSON.parse(readFileSync('node_modules/@mediapipe/tasks-vision/package.json', 'utf8')).version as string

// `--mode single` produces one self-contained HTML file (see scripts/build-single.mjs).
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __MEDIAPIPE_VERSION__: JSON.stringify(mediapipeVersion) },
  build: mode === 'single' ? { outDir: 'dist-single', copyPublicDir: false } : undefined,
  plugins: [
    react(),
    tailwindcss(),
    mode === 'single' && viteSingleFile(),
    VitePWA({
      disable: mode === 'single',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'FormDrift: Exercise Technique Drift Analyser',
        short_name: 'FormDrift',
        description: 'Analyse exercise videos on-device, detect technique drift across repetitions against your own baseline, and get low-distraction feedback.',
        theme_color: '#0b0f17',
        background_color: '#0b0f17',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        categories: ['health', 'fitness', 'sports', 'education'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,json,woff2}'],
        maximumFileSizeToCacheInBytes: 20 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => /\.(task|wasm|mp4)$/.test(url.pathname) || url.pathname.includes('/mediapipe/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'formdrift-models-media',
              expiration: { maxEntries: 30 },
              rangeRequests: true,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}))
