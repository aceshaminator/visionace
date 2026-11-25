import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // The voice note reader runs in a background worker that loads code in pieces, so it needs the module format.
  worker: { format: 'es' },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png'],
      workbox: {
        // The two vosk scripts are a few MB each; allow them into the offline cache.
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        // The Whisper engine file (about 27 MB) is too big to install together with the app.
        // It is saved the first time a voice note is used instead (see the last rule below).
        globIgnores: ['**/ort-*.wasm'],
        // Handles files shared into the app from the phone's Share menu (see public/share-target-sw.js).
        importScripts: ['share-target-sw.js'],
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
          {
            // The voice note reader (Whisper) needs its engine files. Keep them after the first use so voice
            // notes can be written out with no internet. The Whisper model itself is kept by the browser.
            urlPattern: ({ url }) => /\/assets\/ort-.*\.(wasm|mjs)$/.test(url.pathname) || url.hostname === 'cdn.jsdelivr.net',
            handler: 'CacheFirst',
            options: {
              cacheName: 'motion-whisper-engine',
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 10 },
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
        // Makes Motion appear in the Share menu for audio files, such as WhatsApp voice notes (installed app, Android).
        share_target: {
          action: '/share-voice-note',
          method: 'POST',
          enctype: 'multipart/form-data',
          params: {
            files: [{ name: 'audio', accept: ['audio/*', 'video/*', '.opus', '.ogg', '.m4a', '.mp3', '.wav'] }],
          },
        },
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
