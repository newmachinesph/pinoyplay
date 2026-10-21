import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-700.css';
import '../src/style.css';
import '../src/player.css';
import '../src/gallery.css';

export const metadata: Metadata = {
  title: 'PinoyPlay · Laro tayo.',
  description: 'Ten Filipino games. From the kanto to the islands—play offline, keep your scores, and find your next little escape.',
  applicationName: 'PinoyPlay',
  appleWebApp: { capable: true, title: 'PinoyPlay', statusBarStyle: 'black-translucent' },
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  other: { 'mobile-web-app-capable': 'yes' },
};

export const viewport: Viewport = { themeColor: '#0038a8', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
