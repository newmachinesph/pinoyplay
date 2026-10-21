// End-to-end check of the score API against a running server and MySQL; removes its own rows.
// npx tsx --env-file=.env.local scripts/check-api.ts [http://localhost:3000]
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import mysql from 'mysql2/promise';
import { normalizeName } from '../src/server/names.ts';

const base = process.argv[2] ?? 'http://localhost:3000';
const pool = mysql.createPool({ uri: process.env.DATABASE_URL!, connectionLimit: 2 });
const tag = randomBytes(3).toString('hex');
const good = `Tester ${tag}`, bad = `Bastos ${tag}`;
const device = { id: randomUUID(), secret: randomBytes(32).toString('hex') };
const post = (path: string, body: unknown) => fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const board = async () => (await (await fetch(`${base}/api/leaderboard?game=volcano-escape&difficulty=hard`)).json()).scores as { rank: number; username: string; score: number }[];
const mine = (rows: { username: string; score: number }[]) => rows.find(r => r.score === 9_999_990);

try {
  // Seed verdicts so the check does not depend on (or spend) the AI review.
  await pool.execute('INSERT INTO name_reviews (normalized, allowed, reason, model) VALUES (?, 1, "seeded", "check"), (?, 0, "seeded", "check")', [normalizeName(good), normalizeName(bad)]);

  let res = await post('/api/players', { ...device, username: good });
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), { status: 'approved', displayName: good });

  assert.equal((await post('/api/scores', { ...device, game: 'volcano-escape', difficulty: 'hard', score: 9_999_990 })).status, 200);
  assert.equal((await post('/api/scores', { ...device, game: 'volcano-escape', difficulty: 'hard', score: 5 })).status, 200);
  assert.equal(mine(await board())?.username, good, 'approved name and best score are public');

  assert.equal((await post('/api/scores', { ...device, secret: randomBytes(32).toString('hex'), game: 'volcano-escape', difficulty: 'hard', score: 1 })).status, 403);
  assert.equal((await post('/api/scores', { ...device, game: 'volcano-escape', difficulty: 'hard', score: -1 })).status, 400);
  assert.equal((await post('/api/scores', { id: randomUUID(), secret: device.secret, game: 'volcano-escape', difficulty: 'hard', score: 1 })).status, 404);

  res = await post('/api/players', { ...device, username: bad });
  assert.equal((await res.json()).status, 'rejected');
  assert.match(mine(await board())?.username ?? '', /^Kalaro #[0-9A-F]{4}$/, 'rejected names are hidden');

  if (!process.env.OPENAI_API_KEY) {
    res = await post('/api/players', { ...device, username: `Unreviewed ${tag}` });
    assert.equal((await res.json()).status, 'pending', 'without a key names stay pending (fail closed)');
  }
  console.log('API check passed');
} finally {
  await pool.execute('DELETE FROM players WHERE id = ?', [device.id]);
  await pool.execute('DELETE FROM name_reviews WHERE normalized IN (?, ?)', [normalizeName(good), normalizeName(bad)]);
  await pool.end();
}
