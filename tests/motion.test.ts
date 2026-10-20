import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CharacterMotion } from '../src/games/patintero/motion.ts';
import { RushModel, PLAYER_Z } from '../src/games/jeepney-rush/model.ts';
import { footPose } from '../src/games/patintero/runner-rig';

test('character faces travel direction, advances its stride, and stands still at a wall', () => {
  const motion = new CharacterMotion();
  motion.sample(100, 100, 0.02, true);
  motion.sample(100, 90, 0.02, true);
  assert.equal(motion.facing, 2); assert.equal(motion.moving, true);
  const gait = motion.gait;
  motion.sample(100, 90, 0.02, true, { x: 0, y: -1 });
  assert.equal(motion.moving, false); assert.equal(motion.gait, gait);
  motion.sample(90, 90, 0.02, true); assert.equal(motion.facing, 1);
  motion.sample(100, 90, 0.02, true); assert.equal(motion.facing, 3);
  motion.sample(100, 100, 0.02, true); assert.equal(motion.facing, 0);
});

test('pause and respawn do not advance a running animation', () => {
  const motion = new CharacterMotion();
  motion.sample(195, 300, 0.02, true);
  motion.sample(195, 290, 0.02, true);
  const gait = motion.gait;
  motion.sample(195, 290, 0.02, false);
  assert.equal(motion.gait, gait);
  motion.sample(195, 620, 0.02, true);
  assert.equal(motion.gait, gait); assert.equal(motion.moving, false);
  assert.equal(motion.facing, 2);
});

test('jeepney contact starts at the hood; an adjacent lane remains safe', () => {
  const game = new RushModel(); game.start();
  game.entities = [{ id: 1, lane: 1, z: PLAYER_Z - 4.45, kind: 'car', color: 0 }];
  assert.deepEqual(game.tick(0), []);
  game.entities[0].z = PLAYER_Z - 4.3;
  assert.deepEqual(game.tick(0), ['hit']);
  game.start();
  game.entities = [{ id: 2, lane: 0, z: PLAYER_Z - 4.3, kind: 'car', color: 0 }];
  assert.deepEqual(game.tick(0), []); assert.equal(game.lives, 3);
});
test('runner support feet stay grounded and alternate with a continuous recovery swing', () => {
  for (let t = 0; t < 1; t += .01) {
    const a = footPose(t), b = footPose(t + .5);
    assert.notEqual(a.planted, b.planted);
    if (a.planted) assert.equal(a.lift, 0);
    assert.ok(Math.abs(a.forward) <= 17.001 && a.lift >= 0);
  }
  for (const transition of [0, .5, 1]) {
    const before = footPose(transition - .0001), after = footPose(transition + .0001);
    assert.ok(Math.abs(after.forward - before.forward) < .02);
    assert.ok(Math.abs(after.lift - before.lift) < .02);
  }
  assert.equal(footPose(.75, 0).lift, 0);
});
test('jeepney district names cycle with levels and reset at a new run', () => {
  const game = new RushModel(); game.start();
  assert.equal(game.routeName, 'Cubao'); game.level = 5; assert.equal(game.routeName, 'Baywalk');
  game.level = 6; assert.equal(game.routeName, 'Cubao'); game.start(); assert.equal(game.district, 0);
});
