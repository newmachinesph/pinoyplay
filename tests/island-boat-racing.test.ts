import test from 'node:test';
import assert from 'node:assert/strict';
import { BoatModel } from '../src/games/island-boat-racing/model';
import { sampleWater, HullBuoyancy } from '../src/games/island-boat-racing/water';
test('bangka gates score once and leave room for the visible outriggers', () => {
  const m=new BoatModel();m.start();m.gates=[{id:1,x:0,z:3.9,width:5.6,checked:false}];
  m.tick(.02);assert.equal(m.passed,1);const score=m.score;m.tick(.04);assert.equal(m.score,score);
  m.x=2;m.gates=[{id:2,x:0,z:3.9,width:5.6,checked:false}];m.tick(.02);
  assert.equal(m.lives,2);assert.equal(m.passed,1);
});
test('bangka pause freezes the watercourse and late gates stay navigable', () => {
  const m=new BoatModel();m.start('hard');m.stage=100;m.tick(.04);m.pause();
  const distance=m.distance;m.tick(2);assert.equal(m.distance,distance);
  m.resume();m.distance=10000;m.tick(.04);
  assert.ok(m.gates.every(g=>g.width>=3.8));assert.ok(m.speed<=27);
});
test('water slopes agree with the actual surface and buoyancy remains bounded at 30 and 60 fps', () => {
  const epsilon = .0001, s = sampleWater(2, -10, 3);
  assert.ok(Math.abs(s.slopeX - (sampleWater(2 + epsilon, -10, 3).height - s.height) / epsilon) < .0001);
  assert.ok(Math.abs(s.slopeZ - (sampleWater(2, -10 + epsilon, 3).height - s.height) / epsilon) < .0001);
  const hulls = [30, 60].map(fps => {
    const hull = new HullBuoyancy();
    for (let i = 0; i < fps * 20; i++) hull.update(2, -i / fps * 12, i / fps, 1 / fps, .1);
    assert.ok(Math.abs(hull.height) < .5 && Math.abs(hull.roll) < .4 && Math.abs(hull.pitch) < .3);
    const before = { height: hull.height, pitch: hull.pitch, roll: hull.roll };
    hull.update(9, 80, 900, 0, 1);
    assert.deepEqual({ height: hull.height, pitch: hull.pitch, roll: hull.roll }, before);
    return hull;
  });
  assert.ok(Math.abs(hulls[0].height - hulls[1].height) < .03);
});
test('boat steering accelerates and coasts instead of teleporting on drag', () => {
  const m = new BoatModel(); m.start(); m.drag(1);
  assert.equal(m.x, 0); m.tick(.04);
  assert.ok(m.x > 0 && m.x < .1); assert.ok(m.lateralVelocity > 0 && m.lateralVelocity < 7.2);
  m.input.x = -1; for (let i = 0; i < 8; i++) m.tick(.04);
  assert.ok(m.lateralVelocity < 0);
  m.pause(); const position = m.x; m.tick(1); assert.equal(m.x, position);
});
