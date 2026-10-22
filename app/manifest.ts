import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LarongPinoy — Mga larong Pinoy',
    short_name: 'LarongPinoy',
    description: 'Ten Filipino games. Play offline, keep your scores.',
    theme_color: '#0038a8',
    background_color: '#f3f6ff',
    display: 'standalone',
    orientation: 'portrait-primary',
    start_url: '/',
    scope: '/',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
