import test from 'node:test';
import assert from 'node:assert/strict';
import { CoconutModel } from '../src/games/coconut-catcher/model';
test('basket catches buko once, rewards gold, and rejects branches', () => {
  const m=new CoconutModel();m.start();
  const item=(id:number,kind:'buko'|'gold'|'branch')=>({id,x:200,y:554,speed:150,spin:0,kind});
  m.items=[item(1,'buko')];m.tick(.02);assert.equal(m.caught,1);
  m.items=[item(2,'gold')];m.tick(.02);assert.equal(m.score,121);
  m.items=[item(3,'branch')];m.tick(.02);assert.equal(m.lives,2);assert.equal(m.caught,2);
});
test('missed coconuts cost a life and the basket stays within the beach', () => {
  const m=new CoconutModel();m.start();m.drag(-10);assert.equal(m.x,42);m.drag(10);assert.equal(m.x,358);
  m.items=[{id:1,x:30,y:629,speed:150,spin:0,kind:'buko'}];m.tick(.02);assert.equal(m.lives,2);
});
test('a caught coconut remains visible inside the basket briefly, never duplicates its score', () => {
  const m = new CoconutModel(); m.start();
  m.items = [{ id: 9, x: 210, y: 554, speed: 150, spin: 0, kind: 'buko' }];
  m.tick(.02); assert.equal(m.items.length, 0); assert.equal(m.catches.length, 1);
  assert.ok(Math.abs(m.catches[0].x - 10) < 1);
  const score = m.score; m.pause(); m.tick(1); assert.equal(m.catches.length, 1);
  m.resume(); for (let i = 0; i < 12; i++) m.tick(.04);
  assert.equal(m.catches.length, 0); assert.equal(m.score, score);
});
