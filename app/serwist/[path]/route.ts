import { randomUUID } from 'node:crypto';
import { createSerwistRoute } from '@serwist/turbopack';

// The page HTML changes with every build, so each build gets a fresh revision for it.
const revision = randomUUID();

export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } = createSerwistRoute({
  additionalPrecacheEntries: [{ url: '/', revision }],
  swSrc: 'app/sw.ts',
  useNativeEsbuild: true,
});
