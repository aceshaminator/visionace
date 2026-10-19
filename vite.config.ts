import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig({
  base: '/',
  server: {
    host: true,
    port: 3001,
    strictPort: true,
    hmr: {
      port: 3001,
    },
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
  resolve: {
    alias: {
      context: path.resolve(__dirname, 'src/context'),
      components: path.resolve(__dirname, 'src/components'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
});