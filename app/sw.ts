/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { Serwist } from 'serwist';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

// Precache covers every file in public/ (models, art, audio, logos), Next's static chunks and the app page.
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: { cleanupOutdatedCaches: true },
  // Updates wait for the in-game "Update" button (SKIP_WAITING); the first install takes control at once.
  skipWaiting: false,
  clientsClaim: true,
  runtimeCaching: defaultCache,
  fallbacks: { entries: [{ url: '/', matcher: ({ request }) => request.destination === 'document' }] },
});

serwist.addEventListeners();
