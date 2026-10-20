import { rushTuning, type Difficulty } from '../../core/difficulty';
export type Phase = 'ready' | 'running' | 'paused' | 'over';
export type VehicleKind = 'sedan' | 'taxi' | 'van' | 'jeepney';
export type RoadEntity = { id: number; lane: number; z: number; kind: 'car' | 'coin'; color: number; vehicle?: VehicleKind };
export type Crossing = { z: number; phase: 'approach' | 'walking' | 'cleared'; elapsed: number; safe: boolean; direction: number };
export type GameEvent = 'coin' | 'hit' | 'over' | 'level' | 'crossing' | 'yield' | 'missed-yield' | 'clear';
export const LANE_WIDTH = 2.7;
export const PLAYER_Z = 5;
export const CROSSING_STOP_Z = -2;
export const CROSSING_SECONDS = 5.4;
export const routeNames = ['Cubao', 'Palengke', 'Quiapo', 'Binondo', 'Baywalk'];

/** Pure simulation: time, traffic, crossings and scores freeze together on pause. */
export class RushModel {
  phase: Phase = 'ready';
  difficulty: Difficulty = 'normal';
  lane = 1;
  x = 0;
  distance = 0;
  fares = 0;
  lives = 3;
  invincible = 0;
  speed = 16;
  level = 1;
  braking = false;
  bonus = 0;
  crossings = 0;
  crossing?: Crossing;
  entities: RoadEntity[] = [];
  private nextCrossing = 270;
  private spawnIn = 0;
  private nextId = 0;
  private row = 0;
  private previousSafeLane = 1;
  constructor(public random = Math.random) {}
  get tuning() { return rushTuning[this.difficulty]; }
  get cruiseSpeed() { return Math.min(this.tuning.maxSpeed, this.tuning.startSpeed + this.distance / this.tuning.ramp); }
  get trafficInterval() { return Math.max(this.tuning.minInterval, this.tuning.interval - (this.level - 1) * 0.12); }
  get levelProgress() { return this.distance % this.tuning.levelDistance / this.tuning.levelDistance; }
  get district() { return (this.level - 1) % routeNames.length; }
  get routeName() { return routeNames[this.district]; }
  get score() { return Math.floor(this.distance) + this.fares * 25 + this.bonus; }
  start(difficulty: Difficulty = this.difficulty) {
    this.difficulty = difficulty; this.phase = 'running';
    this.lane = 1; this.x = 0; this.distance = 0; this.fares = 0; this.lives = 3;
    this.speed = this.tuning.startSpeed; this.invincible = 0; this.spawnIn = 0.4; this.row = 0;
    this.entities = []; this.nextId = 0; this.level = 1; this.bonus = 0; this.crossings = 0;
    this.braking = false; this.crossing = undefined; this.nextCrossing = this.tuning.firstCrossing; this.previousSafeLane = 1;
  }
  move(direction: number) {
    if (this.phase !== 'running' || this.crossing?.phase === 'walking') return false;
    const next = Math.max(0, Math.min(2, this.lane + direction));
    const moved = next !== this.lane; this.lane = next; return moved;
  }
  pause() { if (this.phase === 'running') { this.phase = 'paused'; this.braking = false; } }
  resume() { if (this.phase === 'paused') this.phase = 'running'; }
  private spawnRow() {
    // Every row has a collectible-marked escape lane. Consecutive safe lanes
    // move at most one lane, so later levels never require an impossible jump.
    const candidates = [0, 1, 2].filter(lane => Math.abs(lane - this.previousSafeLane) <= 1);
    const safe = candidates[Math.min(candidates.length - 1, Math.floor(this.random() * candidates.length))];
    const blocked = [0, 1, 2].filter(lane => lane !== safe);
    const double = this.level >= this.tuning.doubleFrom && this.row % 3 === 2;
    const lanes = double ? blocked : [blocked[Math.min(1, Math.floor(this.random() * 2))]];
    const kinds: VehicleKind[] = ['sedan', 'taxi', 'van', 'jeepney'];
    for (const lane of lanes) this.entities.push({
      id: this.nextId++, lane, z: -76, kind: 'car', color: this.row % 4,
      vehicle: kinds[(this.row + lane) % kinds.length],
    });
    for (let i = 0; i < 3; i++) this.entities.push({ id: this.nextId++, lane: safe, z: -76 - i * 3, kind: 'coin', color: 0 });
    this.previousSafeLane = safe; this.row++; this.spawnIn = this.trafficInterval;
  }
  tick(dt: number): GameEvent[] {
    if (this.phase !== 'running') return [];
    dt = Math.min(0.05, Math.max(0, dt));
    const events: GameEvent[] = [];
    this.invincible = Math.max(0, this.invincible - dt);
    const crossing = this.crossing;
    if (crossing?.phase === 'walking') {
      this.speed = 0; crossing.elapsed += dt;
      if (crossing.elapsed >= CROSSING_SECONDS) {
        crossing.phase = 'cleared'; this.crossings++; this.spawnIn = 1.1;
        if (crossing.safe) { this.bonus += 100; events.push('yield'); }
        events.push('clear');
      }
      return events;
    }
    const approach = crossing?.phase === 'approach';
    // Hold Yield to follow a stopping curve to the crossing. Elsewhere Brake
    // is a normal stop. Acceleration back into traffic is gradual.
    const target = this.braking
      ? approach ? Math.min(this.cruiseSpeed, Math.sqrt(2 * 18 * Math.max(0, CROSSING_STOP_Z - crossing.z))) : 0
      : this.cruiseSpeed;
    const change = (target < this.speed ? 24 : 8) * dt;
    this.speed += Math.max(-change, Math.min(change, target - this.speed));
    let travel = this.speed * dt;
    if (approach && crossing.z + travel >= CROSSING_STOP_Z) {
      travel = Math.max(0, CROSSING_STOP_Z - crossing.z);
      crossing.safe = this.braking && this.speed < 5;
      crossing.phase = 'walking'; crossing.elapsed = 0; this.speed = 0;
      // An emergency stop prevents pedestrian impact; missing the yield costs a life.
      if (!crossing.safe) {
        this.lives--; this.invincible = 1.8; events.push('missed-yield');
        if (this.lives <= 0) { this.phase = 'over'; events.push('over'); }
      }
    }
    this.distance += travel;
    this.x += ((this.lane - 1) * LANE_WIDTH - this.x) * (1 - Math.exp(-14 * dt));
    const level = Math.floor(this.distance / this.tuning.levelDistance) + 1;
    if (level > this.level) { this.level = level; events.push('level'); }
    if (crossing) {
      crossing.z += travel;
      if (crossing.z > 36) this.crossing = undefined;
    } else if (this.distance >= this.nextCrossing) {
      this.crossing = { z: -90, phase: 'approach', elapsed: 0, safe: false, direction: this.crossings % 2 ? -1 : 1 };
      this.nextCrossing = this.distance + Math.max(450, 700 - this.level * 20);
      events.push('crossing');
    }
    if (!this.crossing || this.crossing.phase === 'cleared') {
      // Spawn spacing follows road travel: braking must not stack rows at one spot.
      this.spawnIn -= dt * this.speed / this.cruiseSpeed;
      if (this.spawnIn <= 0) this.spawnRow();
    }
    for (const entity of this.entities) {
      entity.z += travel;
      const aligned = Math.abs(this.x - (entity.lane - 1) * LANE_WIDTH) < (entity.kind === 'car' ? 1.55 : 1.05);
      const dz = entity.z - PLAYER_Z;
      const frontReach = entity.vehicle === 'jeepney' ? 5.3 : entity.vehicle === 'van' ? 4.9 : 4.4;
      const inReach = entity.kind === 'car' ? dz >= -frontReach && dz <= 4.0 : Math.abs(dz) <= 3.1;
      if (!aligned || !inReach || this.phase === 'over') continue;
      if (entity.kind === 'coin') { this.fares++; entity.z = 30; events.push('coin'); }
      else if (this.invincible === 0) {
        this.lives--; this.invincible = 1.8; events.push('hit');
        if (this.lives === 0) { this.phase = 'over'; events.push('over'); break; }
      }
    }
    this.entities = this.entities.filter(e => e.z < 20);
    return events;
  }
}
