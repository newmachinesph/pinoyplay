import assert from 'node:assert/strict';
import { Client } from '@heroiclabs/nakama-js';
import { NakamaAdapter } from '../src/sdk/nakama.ts';
import { PinoyPlaySDK, games } from '../src/sdk/index.ts';
import { difficulties } from '../src/core/difficulty.ts';

const data = new Map<string, string>();
const sdk = new PinoyPlaySDK({ getItem: k => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v); } });
sdk.setUsername('QA Player');
for (const [i, mode] of difficulties.entries()) {
  games.forEach((game, index) => sdk.submitScore(game, (index + 1) * 100 + i, mode));
}
assert.equal(sdk.pendingCount, 30);
const adapter = new NakamaAdapter('http://127.0.0.1:7350', 'pinoyplay-local');
const client = new Client('pinoyplay-local', '127.0.0.1', '7350', false, 8000, false);
try {
  sdk.useOnline(adapter);
  const deadline = Date.now() + 12000;
  while (sdk.pendingCount && Date.now() < deadline) await new Promise(r => setTimeout(r, 100));
  assert.equal(sdk.pendingCount, 0, 'offline queue must drain after reconnect');
  for (const game of games) {
    for (const mode of difficulties) {
      const board = await adapter.leaderboard(game, mode);
      assert.ok(board.some(r => r.username === 'QA Player' && r.score === sdk.best(game, mode)), `${game}/${mode} score must be on its own server board`);
    }
  }
  // A retry of a lower score must not reduce or add to the player's best.
  await adapter.submit({ id: 'retry', game: 'jeepney-rush', score: 10, at: new Date().toISOString() });
  assert.ok((await adapter.leaderboard('jeepney-rush')).some(r => r.username === 'QA Player' && r.score === 101));
  console.log('PASS: offline queue -> Nakama auth -> 30 difficulty leaderboards -> idempotent best-score retries');
} finally {
  const session = await client.authenticateDevice(sdk.player.id, false);
  await client.deleteAccount(session);
}
