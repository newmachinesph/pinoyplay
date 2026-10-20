import test from 'node:test';
import assert from 'node:assert/strict';
import { TumbangModel } from '../src/games/tumbang-preso/model';
test('tumbang requires a successful throw, retrieval, and a return home', () => {
  const m=new TumbangModel();m.start();m.action(true);m.power=m.idealPower;m.action(false);
  for(let i=0;i<18;i++)m.tick(.04);
  assert.equal(m.turn,'retrieve');assert.equal(m.can.fallen,true);assert.equal(m.score,25);
  m.x=m.slipper.x;m.z=m.slipper.z;m.tick(.02);assert.equal(m.slipper.collected,true);
  m.z=6;m.tick(.02);assert.equal(m.stage,2);assert.equal(m.turn,'aim');assert.ok(m.score>125);
});
test('pausing a charged throw cancels it without launching a slipper', () => {
  const m=new TumbangModel();m.start();m.action(true);m.tick(.3);m.pause();m.resume();m.action(false);
  assert.equal(m.turn,'aim');assert.equal(m.charging,false);assert.equal(m.lives,3);
});
