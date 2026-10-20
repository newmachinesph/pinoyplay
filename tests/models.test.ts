import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RushModel, PLAYER_Z } from '../src/games/jeepney-rush/model.ts';
import { PatinteroModel } from '../src/games/patintero/model.ts';

test('jeepney: pause freezes distance, entities and steering; reset clears run', () => {
  const game = new RushModel(() => 0.3); game.start();
  for (let i = 0; i < 50; i++) game.tick(0.02);
  assert.ok(game.distance > 0); assert.ok(game.entities.length);
  game.pause(); const snapshot = JSON.stringify(game);
  game.move(-1); game.tick(1);
  assert.equal(JSON.stringify(game), snapshot);
  game.resume(); game.tick(0.02); assert.ok(game.distance > 16);
  game.start(); assert.equal(game.score, 0); assert.equal(game.lives, 3);
});
test('jeepney: collect a fare once; one crash has a recovery window; third crash ends game', () => {
  const game = new RushModel(); game.start();
  game.entities = [{ id: 999, lane: 1, z: PLAYER_Z, kind: 'coin', color: 0 }];
  assert.deepEqual(game.tick(0), ['coin']); assert.equal(game.fares, 1);
  game.tick(0); assert.equal(game.fares, 1);
  game.entities = [{ id: 1000, lane: 1, z: PLAYER_Z, kind: 'car', color: 0 }];
  assert.deepEqual(game.tick(0), ['hit']); assert.equal(game.lives, 2);
  game.tick(0); assert.equal(game.lives, 2);
  game.invincible = 0; game.tick(0); game.invincible = 0;
  assert.deepEqual(game.tick(0), ['hit', 'over']); assert.equal(game.phase, 'over');
});
test('jeepney: lane bounds and obstacle spawn leave a safe path', () => {
  const game = new RushModel(() => 0.99); game.start();
  for (let i = 0; i < 5; i++) game.move(-1);
  assert.equal(game.lane, 0);
  for (let i = 0; i < 5; i++) game.move(1);
  assert.equal(game.lane, 2);
  for (let i = 0; i < 15; i++) game.tick(0.05);
  const cars = game.entities.filter(e => e.kind === 'car');
  assert.equal(cars.length, 1);
  assert.ok(game.entities.filter(e => e.kind === 'coin').every(e => e.lane !== cars[0].lane));
});
test('patintero: far edge turns objective, returning home increments round', () => {
  const game = new PatinteroModel(); game.start(); game.x = 90;
  game.y = 180; assert.ok(game.tick(0).includes('turn')); assert.equal(game.returning, true);
  game.y = 625; assert.ok(game.tick(0).includes('round')); assert.equal(game.round, 2);
  assert.equal(game.score, 500); assert.equal(game.roundBonus, 100); assert.equal(game.returning, false);
});
test('patintero: tagging resets to safe zone, pause stops guards, input stays bounded', () => {
  const game = new PatinteroModel(); game.start();
  game.x = game.guards[0].x; game.y = game.guards[0].y;
  assert.ok(game.tick(0).includes('hit')); assert.equal(game.y, 620); assert.equal(game.lives, 2);
  game.pause(); const time = game.elapsed; game.tick(3); assert.equal(game.elapsed, time);
  game.resume(); game.input = { x: -1, y: 1 };
  for (let i = 0; i < 500; i++) game.tick(0.04);
  assert.ok(game.x >= 77 && game.y <= 635);
});
