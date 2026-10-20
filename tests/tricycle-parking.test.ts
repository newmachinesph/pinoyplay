import test from 'node:test';
import assert from 'node:assert/strict';
import { ParkingModel } from '../src/games/tricycle-parking/model';
test('parking requires the whole vehicle inside the bay and stopped', () => {
  const m=new ParkingModel();m.start();m.x=m.bay.x;m.z=m.bay.z;m.speed=0;
  for(let i=0;i<30;i++)m.tick(.04);
  assert.equal(m.parked,1);assert.equal(m.stage,2);assert.ok(m.score>250);
  m.x=m.bay.x+m.bay.width/2;m.z=m.bay.z;
  for(let i=0;i<40;i++)m.tick(.04);
  assert.equal(m.parked,1,'a partly outside vehicle must not score');
});
test('parking collision rolls back motion and pause clears throttle', () => {
  const m=new ParkingModel();m.start();m.x=5.48;m.z=4;m.heading=Math.PI/2;m.speed=3;m.input={x:0,y:-1};
  m.tick(.04);assert.equal(m.lives,2);assert.equal(m.x,5.48);
  m.pause();const before=JSON.stringify(m);m.tick(.04);assert.equal(JSON.stringify(m),before);m.resume();assert.deepEqual(m.input,{x:0,y:0});
});
