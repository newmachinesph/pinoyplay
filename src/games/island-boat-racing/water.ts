const waves = [
  { amplitude: .16, length: 17, dx: .38, dz: .925, speed: 1.35 },
  { amplitude: .075, length: 8.5, dx: -.82, dz: .572, speed: 1.9 },
  { amplitude: .028, length: 4.2, dx: .91, dz: .415, speed: 2.7 },
];

/** The mesh, hull and buoys all sample this same travelling water surface. */
export function sampleWater(x: number, z: number, time: number) {
  let height = -.12, slopeX = 0, slopeZ = 0;
  for (const wave of waves) {
    const k = Math.PI * 2 / wave.length;
    const phase = k * (x * wave.dx + z * wave.dz) - time * wave.speed;
    height += Math.sin(phase) * wave.amplitude;
    const slope = Math.cos(phase) * wave.amplitude * k;
    slopeX += slope * wave.dx; slopeZ += slope * wave.dz;
  }
  return { height, slopeX, slopeZ };
}

export class HullBuoyancy {
  height = 0;
  pitch = 0;
  roll = 0;
  private velocity = { height: 0, pitch: 0, roll: 0 };
  reset() { this.height = this.pitch = this.roll = 0; this.velocity = { height: 0, pitch: 0, roll: 0 }; }
  update(x: number, z: number, time: number, dt: number, bank: number, yaw = 0) {
    if (dt <= 0) return;
    const sin = Math.sin(yaw), cos = Math.cos(yaw);
    const sample = (side: number, forward: number) => sampleWater(x + side * cos + forward * sin, z - side * sin + forward * cos, time).height;
    const bow = sample(0, -1.35), stern = sample(0, 1.35), left = sample(-1.1, 0), right = sample(1.1, 0);
    const target = { height: (bow + stern + left + right) / 4 + .04, pitch: Math.atan2(bow - stern, 2.7), roll: Math.atan2(right - left, 2.2) + bank };
    // Substeps keep the damped buoyancy stable at both 30 and 60 fps.
    const steps = Math.max(1, Math.ceil(dt / .008));
    const step = dt / steps;
    for (let i = 0; i < steps; i++) for (const key of ['height', 'pitch', 'roll'] as const) {
      this.velocity[key] += ((target[key] - this[key]) * 70 - this.velocity[key] * 15) * step;
      this[key] += this.velocity[key] * step;
    }
  }
}
