import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PinoyPlaySDK, type OnlineAdapter } from '../src/sdk/index.ts';
function store() { const map = new Map<string, string>(); return { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => { map.set(k, v); } }; }
test('scores and username persist offline, best survives history rotation, queue is bounded', () => {
  const storage = store(); const sdk = new PinoyPlaySDK(storage);
  sdk.setUsername('Juan'); sdk.submitScore('jeepney-rush', 9999); sdk.submitScore('patintero', 400);
  for (let i = 0; i < 150; i++) sdk.submitScore('jeepney-rush', i);
  const restored = new PinoyPlaySDK(storage);
  assert.equal(restored.player.username, 'Juan'); assert.equal(restored.best('jeepney-rush'), 9999);
  assert.equal(restored.best('patintero'), 400); assert.equal(restored.pendingCount, 2);
});
test('reconnect drains queue without dropping a higher result submitted during upload', async () => {
  const sdk = new PinoyPlaySDK(store()); sdk.submitScore('jeepney-rush', 100);
  let release!: () => void;
  const gate = new Promise<void>(resolve => release = resolve);
  const uploaded: number[] = [];
  const adapter: OnlineAdapter = {
    connect: async () => {},
    submit: async s => { uploaded.push(s.score); await gate; },
    leaderboard: async () => [],
  };
  sdk.useOnline(adapter); await new Promise(r => setTimeout(r, 0));
  sdk.submitScore('jeepney-rush', 500); release();
  await new Promise(r => setTimeout(r, 0));
  await sdk.sync(); assert.deepEqual(uploaded, [100, 500]); assert.equal(sdk.pendingCount, 0);
});
test('invalid scores and names rejected; unavailable or corrupt storage never blocks play', () => {
  const sdk = new PinoyPlaySDK({ getItem: () => '{bad json', setItem: () => { throw new Error('blocked'); } });
  assert.equal(sdk.storageAvailable, false);
  sdk.submitScore('patintero', 100); assert.equal(sdk.best('patintero'), 100);
  assert.throws(() => sdk.submitScore('patintero', NaN)); assert.throws(() => sdk.submitScore('patintero', -1));
  assert.throws(() => sdk.setUsername('<script>'));
});
