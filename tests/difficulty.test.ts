import { test } from 'node:test';
import assert from 'node:assert/strict';
import { difficulties } from '../src/core/difficulty.ts';
import { RushModel, CROSSING_STOP_Z, CROSSING_SECONDS } from '../src/games/jeepney-rush/model.ts';
import { PatinteroModel } from '../src/games/patintero/model.ts';
import { boardId, PinoyPlaySDK } from '../src/sdk/index.ts';

test('difficulty changes starting pace; progression increases pressure with finite caps', () => {
  const speeds = difficulties.map(mode => { const g = new RushModel(); g.start(mode); return g.speed; });
  assert.ok(speeds[0] < speeds[1] && speeds[1] < speeds[2]);
  for (const mode of difficulties) {
    const game = new RushModel(); game.start(mode);
    const startInterval = game.trafficInterval;
    game.distance = 100_000; game.tick(0);
    assert.ok(game.trafficInterval < startInterval);
    assert.equal(game.cruiseSpeed, game.tuning.maxSpeed);
    assert.ok(game.trafficInterval >= 1);
    game.start(); assert.equal(game.difficulty, mode); assert.equal(game.level, 1); assert.equal(game.crossing, undefined);
  }
});

test('all modes keep an open path and introduce double traffic rows at later levels', () => {
  for (const mode of difficulties) {
    let seed = 91, doubleRows = 0, lastSafe = 1, rows = 0;
    const game = new RushModel(() => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; });
    game.start(mode); game.lives = 10_000;
    const seen = new Set<number>();
    for (let i = 0; i < 16000; i++) {
      game.braking = game.crossing?.phase === 'approach';
      game.tick(0.05);
      const fresh = game.entities.filter(e => !seen.has(e.id));
      const cars = fresh.filter(e => e.kind === 'car');
      if (cars.length) {
        const safe = fresh.find(e => e.kind === 'coin')!.lane;
        assert.ok(cars.length <= 2);
        assert.ok(cars.every(car => car.lane !== safe));
        assert.ok(Math.abs(safe - lastSafe) <= 1);
        assert.equal(new Set(cars.map(car => car.lane)).size, cars.length);
        if (cars.length === 2) doubleRows++;
        rows++; lastSafe = safe;
      }
      fresh.forEach(e => seen.add(e.id));
    }
    assert.ok(rows > 30, mode); assert.ok(doubleRows > 0, mode);
  }
});

test('a timely yield stops before pedestrians, freezes on pause, and pays one bonus', () => {
  for (const mode of difficulties) {
    const game = new RushModel(); game.start(mode);
    game.distance = 5000; game.speed = game.cruiseSpeed;
    game.crossing = { z: -70, phase: 'approach', elapsed: 0, safe: false, direction: 1 };
    game.braking = true;
    for (let i = 0; i < 500 && game.crossing.phase === 'approach'; i++) game.tick(0.02);
    assert.equal(game.crossing.phase, 'walking', mode);
    assert.equal(game.crossing.safe, true, mode);
    assert.equal(game.crossing.z, CROSSING_STOP_Z); assert.equal(game.speed, 0); assert.equal(game.lives, 3);
    const distance = game.distance;
    game.pause(); const snapshot = JSON.stringify(game); game.tick(0.05);
    assert.equal(JSON.stringify(game), snapshot);
    game.resume();
    for (let i = 0; i < CROSSING_SECONDS / 0.02 + 2; i++) game.tick(0.02);
    assert.equal(game.bonus, 100); assert.equal(game.crossings, 1);
    assert.ok(game.distance >= distance);
    for (let i = 0; i < 10; i++) game.tick(0.02);
    assert.equal(game.bonus, 100);
  }
});

test('missing a crossing triggers one emergency stop and never drives into pedestrians', () => {
  const game = new RushModel(); game.start('hard');
  game.crossing = { z: CROSSING_STOP_Z - 0.1, phase: 'approach', elapsed: 0, safe: false, direction: 1 };
  assert.ok(game.tick(0.05).includes('missed-yield'));
  assert.equal(game.lives, 2); assert.equal(game.crossing.z, CROSSING_STOP_Z);
  const distance = game.distance;
  for (let i = 0; i < 60; i++) game.tick(0.05);
  assert.equal(game.distance, distance); assert.equal(game.lives, 2); assert.equal(game.bonus, 0);
});

test('braking outside a crossing does not pile traffic rows into an unavoidable wall', () => {
  const game = new RushModel(() => 0.1); game.start();
  for (let i = 0; i < 30; i++) game.tick(0.05);
  game.braking = true;
  for (let i = 0; i < 40; i++) game.tick(0.05);
  assert.equal(game.speed, 0);
  const stopped = JSON.stringify(game.entities), distance = game.distance;
  for (let i = 0; i < 500; i++) game.tick(0.05);
  assert.equal(game.distance, distance);
  assert.equal(JSON.stringify(game.entities), stopped);
  game.braking = false;
  for (let i = 0; i < 70; i++) game.tick(0.05);
  assert.ok(game.distance > distance); assert.ok(game.speed > 0);
});

test('last-life missed yield ends the run and restart clears braking and crossing state', () => {
  const game = new RushModel(); game.start(); game.lives = 1;
  game.crossing = { z: CROSSING_STOP_Z - 0.1, phase: 'approach', elapsed: 0, safe: false, direction: 1 };
  assert.ok(game.tick(0.05).includes('over')); assert.equal(game.phase, 'over');
  game.start('easy');
  assert.equal(game.crossing, undefined); assert.equal(game.braking, false); assert.equal(game.bonus, 0); assert.equal(game.lives, 3);
});

test('Patintero difficulty, countdown, time bonus and round speed all follow selected mode', () => {
  for (const mode of difficulties) {
    const game = new PatinteroModel(); game.start(mode);
    const opening = game.roundLimit, pace = game.guardPace;
    game.roundTime = 12; game.x = 90; game.y = 180; game.tick(0);
    game.y = 625; game.tick(0);
    assert.equal(game.roundBonus, (opening - 12) * 2);
    assert.equal(game.score, 400 + game.roundBonus);
    assert.ok(game.guardPace > pace); assert.ok(game.roundLimit < opening);
    assert.equal(game.roundTime, 0);
    game.round = 100;
    assert.equal(game.roundLimit, game.tuning.minSeconds); assert.equal(game.guardPace, game.tuning.maxPace);
  }
});

test('timeout costs one life, resets the attempt, and pause freezes the countdown', () => {
  const game = new PatinteroModel(); game.start();
  game.roundTime = game.roundLimit - 0.01;
  game.pause(); game.tick(1); assert.ok(game.secondsLeft < 0.02);
  game.resume(); assert.ok(game.tick(0.02).includes('timeout'));
  assert.equal(game.lives, 2); assert.equal(game.roundTime, 0); assert.equal(game.y, 620);
  assert.equal(game.returning, false);
  game.tick(0.02); assert.equal(game.lives, 2);
});

test('round changes preserve guard positions instead of jumping the patrol phase', () => {
  const game = new PatinteroModel(); game.start(); game.guardTime = 4;
  game.tick(0); const before = game.guards.map(g => ({ ...g }));
  game.round++; game.tick(0);
  assert.deepEqual(game.guards, before);
});

test('legacy scores migrate to Normal; all six mode boards and choices stay independent', () => {
  const data = new Map([['pinoyplay.sdk.v1', JSON.stringify({
    version: 1, player: { id: 'old-player', username: 'Juan' }, sound: false,
    scores: [{ id: 'old', game: 'jeepney-rush', score: 999, at: '2026-10-20' }], pending: [],
  })]]);
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } };
  const sdk = new PinoyPlaySDK(storage);
  assert.equal(sdk.best('jeepney-rush'), 999); assert.equal(sdk.best('jeepney-rush', 'easy'), 0);
  for (const game of ['jeepney-rush', 'patintero'] as const) for (const [i, mode] of difficulties.entries()) sdk.submitScore(game, 50 + i * 100, mode);
  sdk.setDifficulty('jeepney-rush', 'hard'); sdk.setDifficulty('patintero', 'easy');
  const restored = new PinoyPlaySDK(storage);
  assert.equal(restored.pendingCount, 6); assert.equal(restored.best('jeepney-rush', 'hard'), 250);
  assert.equal(restored.best('patintero', 'easy'), 50); assert.equal(restored.difficulty('jeepney-rush'), 'hard');
  assert.equal(restored.difficulty('patintero'), 'easy'); assert.equal(restored.sound, false);
  assert.equal(boardId('jeepney-rush'), 'jeepney-rush'); assert.equal(boardId('jeepney-rush', 'easy'), 'jeepney-rush-easy');
});
