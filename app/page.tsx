'use client';
import { useEffect } from 'react';

/** The games and UI are DOM-driven TypeScript; React only provides the mount point. */
export default function Home() {
  useEffect(() => { void import('../src/main'); }, []);
  return <div id="app" />;
}
