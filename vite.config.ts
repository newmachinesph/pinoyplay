import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  server: { watch: { ignored: ['**/artifacts/**'] } },
  plugins: [VitePWA({
    registerType: 'prompt',
    includeAssets: ['icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
    manifest: {
      name: 'PinoyPlay — Larong Pinoy',
      short_name: 'PinoyPlay',
      description: 'Ten Filipino games. Play offline, keep your scores.',
      theme_color: '#0038a8',
      background_color: '#f3f6ff',
      display: 'standalone',
      orientation: 'portrait-primary',
      start_url: './',
      scope: './',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,webp,glb,svg,woff2,mp3}'],
      navigateFallback: 'index.html',
      cleanupOutdatedCaches: true,
    },
  })],
});
