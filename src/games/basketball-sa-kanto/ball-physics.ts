export const BALL_RADIUS = .24;
export const RIM_RADIUS = .48;
export type Ball = { x: number; y: number; z: number; vx: number; vy: number; vz: number };
type Hoop = { x: number; y: number; z: number };
export type Impact = 'board' | 'rim' | 'floor';

function reflect(ball: Ball, nx: number, ny: number, nz: number, restitution: number) {
  const speed = ball.vx * nx + ball.vy * ny + ball.vz * nz;
  if (speed >= 0) return false;
  ball.vx -= (1 + restitution) * speed * nx;
  ball.vy -= (1 + restitution) * speed * ny;
  ball.vz -= (1 + restitution) * speed * nz;
  return true;
}

/** Substepped sphere/box and sphere/torus contacts prevent shots tunnelling. */
export function stepBasketball(ball: Ball, hoop: Hoop, dt: number, onBasket: () => void, onImpact: (impact: Impact) => void = () => {}) {
  const steps = Math.max(1, Math.ceil(dt / .004), Math.ceil(Math.hypot(ball.vx, ball.vy, ball.vz) * dt / (BALL_RADIUS * .35)));
  const step = dt / steps;
  for (let i = 0; i < steps; i++) {
    const before = { x: ball.x, y: ball.y, z: ball.z };
    ball.x += ball.vx * step; ball.z += ball.vz * step;
    ball.y += ball.vy * step - 4.9 * step * step; ball.vy -= 9.8 * step;
    const bx = Math.max(hoop.x - 1.25, Math.min(hoop.x + 1.25, ball.x));
    const by = Math.max(hoop.y - .15, Math.min(hoop.y + 1.45, ball.y));
    const bz = Math.max(hoop.z - .68, Math.min(hoop.z - .56, ball.z));
    const dx = ball.x - bx, dy = ball.y - by, dz = ball.z - bz;
    const distance = Math.hypot(dx, dy, dz);
    if (distance < BALL_RADIUS) {
      const nx = distance > .00001 ? dx / distance : 0, ny = distance > .00001 ? dy / distance : 0;
      const nz = distance > .00001 ? dz / distance : before.z > hoop.z - .62 ? 1 : -1;
      ball.x += nx * (BALL_RADIUS - distance + .0001); ball.y += ny * (BALL_RADIUS - distance + .0001); ball.z += nz * (BALL_RADIUS - distance + .0001);
      if (reflect(ball, nx, ny, nz, .76)) onImpact('board');
    }
    const radial = Math.hypot(ball.x - hoop.x, ball.z - hoop.z);
    if (radial > .0001) {
      const rx = hoop.x + (ball.x - hoop.x) / radial * RIM_RADIUS, rz = hoop.z + (ball.z - hoop.z) / radial * RIM_RADIUS;
      const dx = ball.x - rx, dy = ball.y - hoop.y, dz = ball.z - rz, distance = Math.hypot(dx, dy, dz);
      const contact = BALL_RADIUS + .035;
      if (distance > .0001 && distance < contact) {
        ball.x += dx / distance * (contact - distance); ball.y += dy / distance * (contact - distance); ball.z += dz / distance * (contact - distance);
        if (reflect(ball, dx / distance, dy / distance, dz / distance, .68)) onImpact('rim');
      }
    }
    if (before.y >= hoop.y && ball.y < hoop.y && ball.vy < 0) {
      const t = (before.y - hoop.y) / (before.y - ball.y);
      const x = before.x + (ball.x - before.x) * t, z = before.z + (ball.z - before.z) * t;
      if (Math.hypot(x - hoop.x, z - hoop.z) < RIM_RADIUS - BALL_RADIUS - .02) onBasket();
    }
    if (ball.y < BALL_RADIUS) {
      ball.y = BALL_RADIUS;
      if (ball.vy < -.5) onImpact('floor');
      ball.vy = Math.abs(ball.vy) > .4 ? Math.abs(ball.vy) * .62 : 0;
      ball.vx *= .84; ball.vz *= .84;
    }
  }
}
