import test from 'node:test';
import assert from 'node:assert/strict';
import { HaloModel } from '../src/games/halo-halo-shop/model';
test('halo-halo checks ingredient order, supports undo, and delivers input events', () => {
  const m=new HaloModel();m.start();m.choose(5);m.undo();assert.equal(m.glass.length,0);
  m.recipe.forEach(i=>m.choose(i));m.action(true);
  assert.equal(m.served,1);assert.ok(m.score>100);assert.ok(m.tick(.02).includes('coin'));
  m.choose(5);m.action(true);assert.equal(m.lives,2);assert.equal(m.served,1);
});
test('halo-halo progression adds layers; timer expiry finishes on the third mistake', () => {
  const m=new HaloModel();m.start('hard');
  for(let i=0;i<3;i++){m.invincible=0;m.remaining=.01;m.tick(.02);}
  assert.equal(m.phase,'over');assert.equal(m.lives,0);
  m.start('easy');assert.equal(m.recipe.length,4);assert.equal(m.lives,3);
});
