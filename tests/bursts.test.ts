import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import { Bursts } from '../src/core/rendering/bursts.ts';

const scaleAt = (b: Bursts, i: number) => {
  const m = new T.Matrix4(); b.getMatrixAt(i, m);
  return new T.Vector3().setFromMatrixScale(m).length();
};

test('bursts start visible, fly upward, and shrink to nothing when their life ends', () => {
  const b = new Bursts(8);
  assert.equal(scaleAt(b, 0), 0, 'idle particles are hidden');
  b.emit('confetti', { x: 1, y: 2, z: 3 }, 4);
  b.update(.05);
  assert.ok(scaleAt(b, 0) > 0);
  const m = new T.Matrix4(); b.getMatrixAt(0, m);
  assert.ok(new T.Vector3().setFromMatrixPosition(m).y > 2, 'confetti launches upward');
  for (let i = 0; i < 100; i++) b.update(.04);
  for (let i = 0; i < 8; i++) assert.equal(scaleAt(b, i), 0);
});

test('a full pool recycles the oldest particles instead of growing', () => {
  const b = new Bursts(4);
  b.emit('dust', { x: 0, y: 0, z: 0 }, 6);
  b.update(.01);
  assert.equal(b.count, 4);
  for (let i = 0; i < 4; i++) assert.ok(scaleAt(b, i) > 0);
});
