export type Facing = 0 | 1 | 2 | 3; // down, left, up, right — atlas row order

/** Animation follows distance actually travelled, never just a held button. */
export class CharacterMotion {
  facing: Facing = 0;
  heading = Math.PI / 2;
  gait = 0;
  moving = false;
  speed = 0;
  private last?: { x: number; y: number };
  sample(x: number, y: number, dt: number, active: boolean, intent?: { x: number; y: number }) {
    const dx = this.last ? x - this.last.x : 0, dy = this.last ? y - this.last.y : 0;
    this.last = { x, y };
    const distance = Math.hypot(dx, dy);
    // A tag/reset teleports to home. It is not a very fast running stride.
    this.moving = active && dt > 0 && distance > 0.025 && distance < 35;
    this.speed = this.moving ? distance / dt : 0;
    const vx = this.moving ? dx : intent?.x ?? 0, vy = this.moving ? dy : intent?.y ?? 0;
    if (active && Math.hypot(vx, vy) > 0.01) {
      this.heading = Math.atan2(vy, vx);
      this.facing = Math.abs(vy) >= Math.abs(vx) ? (vy < 0 ? 2 : 0) : (vx < 0 ? 1 : 3);
    }
    if (this.moving) this.gait = (this.gait + distance / 13) % 4;
    return distance < 35 ? distance : 0;
  }
  get frame() { return this.facing * 4 + Math.floor(this.gait); }
}
