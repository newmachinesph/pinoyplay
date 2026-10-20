import test from 'node:test';
import assert from 'node:assert/strict';
import { PikoModel, pikoSequence } from '../src/games/piko-challenge/model';
test('piko follows its out-and-back sequence and ignores taps during a hop', () => {
  const m=new PikoModel();m.start();
  for(const n of pikoSequence){m.choose(n);m.choose(8);for(let i=0;i<8;i++)m.tick(.04);}
  assert.equal(m.stage,2);assert.equal(m.hops,15);assert.equal(m.lives,3);assert.ok(m.score>450);
});
test('piko wrong squares and expired timing windows cost lives', () => {
  const m=new PikoModel();m.start();m.choose(8);assert.equal(m.lives,2);
  for(let i=0;i<70;i++)m.tick(.04);assert.equal(m.lives,1);
});
