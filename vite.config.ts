import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      workbox: {
        // The two vosk scripts are a few MB each; allow them into the offline cache.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        // The 41 MB speech model is too big to pre-cache, so it is saved the first time it loads.
        // After that the app can recognise speech with no internet.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/models/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'motion-speech-model',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 2 },
            },
          },
        ],
      },
      manifest: {
        name: 'Motion - Speech & Haptic Assistive PWA',
        short_name: 'Motion',
        description:
          'Assistive speech articulation and tactile haptic feedback application for Deaf, Hard-of-Hearing, and Senior users.',
        theme_color: '#10b981',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
