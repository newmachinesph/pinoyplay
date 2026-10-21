import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askModel, cleanUsername, listVerdict, normalizeName, reviewName, type Verdict, type VerdictCache } from '../src/server/names.ts';
import { HttpError, MAX_SCORE, parseBoard, parseScore, publicName, rateLimit } from '../src/server/api.ts';

const reply = (payload: unknown, init: { status?: number; status_field?: string } = {}) => async () => new Response(JSON.stringify({
  status: init.status_field ?? 'completed',
  output: [{ type: 'reasoning' }, { type: 'message', content: [typeof payload === 'string' ? { type: 'refusal', refusal: payload } : { type: 'output_text', text: JSON.stringify(payload) }] }],
}), { status: init.status ?? 200 });
const env = { OPENAI_API_KEY: 'test-key' };

test('usernames are cleaned to the 2-20 character rule; evasions fold to one cache key', () => {
  assert.equal(cleanUsername('  Juan   dela  Cruz '), 'Juan dela Cruz');
  assert.equal(cleanUsername('Ñiño_23'), 'Ñiño_23');
  assert.equal(cleanUsername('a'), null);
  assert.equal(cleanUsername('<script>'), null);
  assert.equal(cleanUsername(42), null);
  assert.equal(normalizeName('G@g0 P-u_t.4'), normalizeName('gago puta'));
  assert.equal(normalizeName('ÁNGEL'), 'angel');
  assert.equal(normalizeName('Пётр'), 'петр');
});

test('the model verdict is parsed; refusals reject; failures and missing keys return null (fail closed)', async () => {
  const sent: { url: string; body: string; auth: string }[] = [];
  const spy = (async (url: string, init: RequestInit) => {
    sent.push({ url, body: String(init.body), auth: new Headers(init.headers).get('authorization') ?? '' });
    return reply({ allowed: false, reason: 'Tagalog profanity' })();
  }) as typeof fetch;
  assert.deepEqual(await askModel('Tangina', 'tangina', env, spy), { allowed: false, reason: 'Tagalog profanity', model: 'gpt-6-luna' });
  assert.equal(sent[0].url, 'https://api.openai.com/v1/responses');
  assert.equal(sent[0].auth, 'Bearer test-key');
  assert.equal(JSON.parse(sent[0].body).text.format.type, 'json_schema');
  assert.equal((await askModel('Juan', 'juan', { ...env, OPENAI_NAME_MODEL: 'other-model' }, reply({ allowed: true, reason: 'ok' }) as typeof fetch))?.model, 'other-model');
  assert.equal((await askModel('x', 'x', env, reply('I cannot help') as typeof fetch))?.allowed, false);
  assert.equal(await askModel('Juan', 'juan', {}, reply({ allowed: true, reason: '' }) as typeof fetch), null);
  assert.equal(await askModel('Juan', 'juan', env, reply({}, { status: 500 }) as typeof fetch), null);
  assert.equal(await askModel('Juan', 'juan', env, reply({ allowed: true, reason: '' }, { status_field: 'incomplete' }) as typeof fetch), null);
  assert.equal(await askModel('Juan', 'juan', env, reply({ allowed: 'yes' }) as typeof fetch), null);
  assert.equal(await askModel('Juan', 'juan', env, (async () => { throw new Error('timeout'); }) as typeof fetch), null);
});

test('each folded name is reviewed once; unavailable reviews are not cached', async () => {
  const store = new Map<string, Verdict>();
  const cache: VerdictCache = { get: async k => store.get(k) ?? null, set: async (k, v) => { store.set(k, v); } };
  let calls = 0;
  const ok = async () => { calls++; return { allowed: true, reason: 'clean', model: 'm' }; };
  await reviewName('Juan', cache, ok);
  await reviewName('JUAN', cache, ok);
  assert.equal(calls, 1);
  assert.equal(await reviewName('Pedro', cache, async () => null), null);
  assert.equal(store.has('pedro'), false);
});

test('API input is validated at the boundary; private names stay hidden until approved', () => {
  const device = { id: '123e4567-e89b-42d3-a456-426614174000', secret: 'ab'.repeat(32) };
  assert.deepEqual(parseScore({ ...device, game: 'patintero', difficulty: 'hard', score: 120 }), { ...device, game: 'patintero', difficulty: 'hard', score: 120 });
  for (const bad of [{ ...device, game: 'chess', difficulty: 'hard', score: 1 }, { ...device, game: 'patintero', difficulty: 'insane', score: 1 },
    { ...device, game: 'patintero', difficulty: 'easy', score: 1.5 }, { ...device, game: 'patintero', difficulty: 'easy', score: MAX_SCORE + 1 },
    { ...device, id: 'x', game: 'patintero', difficulty: 'easy', score: 1 }, { ...device, secret: 'short', game: 'patintero', difficulty: 'easy', score: 1 }, null, []])
    assert.throws(() => parseScore(bad), (e: unknown) => e instanceof HttpError && e.status === 400);
  assert.deepEqual(parseBoard(new URLSearchParams('game=jeepney-rush')), { game: 'jeepney-rush', difficulty: 'normal' });
  assert.throws(() => parseBoard(new URLSearchParams('game=jeepney-rush&difficulty=x')));
  assert.equal(publicName('approved', 'Juan', device.id), 'Juan');
  assert.equal(publicName('pending', 'Juan', device.id), 'Kalaro #4000');
  assert.equal(publicName('rejected', 'Bastos', device.id), 'Kalaro #4000');
});

test('rate limits allow a burst then answer 429 until the window resets', () => {
  for (let i = 0; i < 3; i++) rateLimit('test:ip', 3, 1000, 0);
  assert.throws(() => rateLimit('test:ip', 3, 1000, 500), (e: unknown) => e instanceof HttpError && e.status === 429);
  assert.doesNotThrow(() => rateLimit('test:ip', 3, 1000, 1001));
});

test('the word list rejects whole-name and whole-word hits for free; look-alikes go to the AI', async () => {
  for (const name of ['Putangina', 'Tng1na M0', 'G@go ka', 'Yawa ka', 'p u t a', 'Fuck You', 'Pekpek', 'ちんこ'])
    assert.equal(listVerdict(name)?.allowed, false, name);
  for (const name of ['Juan Dela Cruz', 'Scunthorpe', 'Therapist', 'Cassandra', 'Essex', 'Peniston', 'Leche Flan', 'Pepe', 'Dikit'])
    assert.equal(listVerdict(name), null, name);
  let calls = 0;
  const cache: VerdictCache = { get: async () => null, set: async () => {} };
  const verdict = await reviewName('Tangina mo', cache, async () => { calls++; return null; });
  assert.equal(verdict?.model, 'wordlist');
  assert.equal(calls, 0, 'a list hit never spends an AI call');
});
