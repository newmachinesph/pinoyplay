import test from 'node:test';
import assert from 'node:assert/strict';
import { VolcanoModel } from '../src/games/volcano-escape/model';
test('volcano ledges are generated inside the jump envelope', () => {
  const m=new VolcanoModel();m.random=()=>.75;m.start('hard');
  const jumpHeight=345**2/(2*660);
  for(let i=1;i<m.platforms.length;i++){
    const a=m.platforms[i-1],b=m.platforms[i],dy=b.y-a.y;
    assert.ok(dy<jumpHeight);const descendingTime=(345+Math.sqrt(345**2-2*660*dy))/660;
    assert.ok(Math.abs(b.x-a.x)<180*descendingTime+b.width/2);
  }
});
test('jump cannot be repeated in midair; lava restores the last solid checkpoint', () => {
  const m=new VolcanoModel();m.start();m.action(true);m.tick(.02);const vy=m.vy;
  m.action(true);m.tick(.02);assert.ok(m.vy<vy);
  m.lava=m.y+30;m.tick(.02);assert.equal(m.lives,2);assert.equal(m.y,105);assert.ok(m.lava<m.y-100);
  m.pause();const y=m.y;m.tick(.04);assert.equal(m.y,y);
});
