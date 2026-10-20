import test from 'node:test';
import assert from 'node:assert/strict';
import { BasketballModel } from '../src/games/basketball-sa-kanto/model';
import { stepBasketball, BALL_RADIUS } from '../src/games/basketball-sa-kanto/ball-physics';
test('an aimed, timed basketball shot passes the rim once and awards a streak', () => {
  const m=new BasketballModel();m.start();m.aim=m.idealAim;m.action(true);m.power=m.idealPower;m.action(false);
  for(let i=0;i<66;i++)m.tick(.04);
  assert.equal(m.baskets,1);assert.equal(m.streak,1);assert.equal(m.score,110);assert.equal(m.lives,3);assert.equal(m.shooting,false);
});
test('a missed shot costs one life; pause freezes time and restart resets aim', () => {
  const m=new BasketballModel();m.start('hard');m.aim=.42;m.action(true);m.power=0;m.action(false);
  for(let i=0;i<66;i++)m.tick(.04);assert.equal(m.lives,2);assert.equal(m.score,0);
  m.pause();const t=m.remaining;m.tick(1);assert.equal(m.remaining,t);
  m.start();assert.equal(m.aim,0);assert.equal(m.lives,3);assert.equal(m.shooting,false);assert.equal(m.power,0);
});
test('fast shots rebound off either side of the backboard without tunnelling', () => {
  const hoop = { x: 0, y: 3.25, z: -4.5 };
  for (const direction of [-1, 1]) {
    const ball = { x: 0, y: 4, z: direction < 0 ? -3.8 : -6.5, vx: 0, vy: 0, vz: direction * 100 };
    const impacts: string[] = [];
    stepBasketball(ball, hoop, .04, () => assert.fail('board shot cannot score'), i => impacts.push(i));
    assert.ok(impacts.includes('board'));
    assert.equal(Math.sign(ball.vz), -direction);
    assert.ok(direction < 0 ? ball.z > hoop.z - .56 : ball.z < hoop.z - .68);
  }
});
test('rim contact bounces upward; a clean descending shot scores but an ascending one does not', () => {
  const hoop = { x: 0, y: 3.25, z: -4.5 };
  const rimBall = { x: .48, y: 3.8, z: -4.5, vx: 0, vy: -9, vz: 0 };
  let rim = false;
  stepBasketball(rimBall, hoop, .08, () => assert.fail('rim contact'), i => { rim ||= i === 'rim'; });
  assert.ok(rim); assert.ok(rimBall.vy > 0);
  let baskets = 0;
  const clean = { x: 0, y: 3.8, z: -4.5, vx: 0, vy: -5, vz: 0 };
  stepBasketball(clean, hoop, .3, () => baskets++);
  assert.equal(baskets, 1);
  const upward = { x: 0, y: 2.8, z: -4.5, vx: 0, vy: 8, vz: 0 };
  stepBasketball(upward, hoop, .1, () => baskets++);
  assert.equal(baskets, 1);
});
test('basketball floor dissipates energy, walking is bounded, and charging plants the feet', () => {
  const ball = { x: 3, y: .3, z: 2, vx: 2, vy: -8, vz: 1 };
  stepBasketball(ball, { x: 0, y: 3.25, z: -4.5 }, .03, () => {});
  assert.ok(ball.y >= BALL_RADIUS); assert.ok(ball.vy > 0 && ball.vy < 8);
  const m = new BasketballModel(); m.start(); m.input = { x: 1, y: 1 };
  for (let i = 0; i < 80; i++) m.tick(.04);
  assert.ok(m.player.x <= 4.5 && m.player.z <= 6.6);
  const position = { ...m.player }; m.action(true); m.tick(.04);
  assert.deepEqual(m.player, position); m.pause(); m.tick(.04);
  assert.deepEqual(m.player, position); assert.equal(m.charging, false);
});
