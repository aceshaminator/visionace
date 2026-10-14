import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/',
  server: {
    host: true,
    port: 3001,
    strictPort: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.ico'],
      manifest: {
        name: 'Motion',
        short_name: 'Motion',
        theme_color: '#000000',
      },
    }),
  ],
});