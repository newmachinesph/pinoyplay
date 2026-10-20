import type { Phase } from '../jeepney-rush/model';
import { courtTuning, type Difficulty } from '../../core/difficulty';
export const COURT = { left: 65, right: 325, top: 220, bottom: 565, center: 195 };
export type Guard = { x: number; y: number; vertical: boolean };
export class PatinteroModel {
  phase: Phase = 'ready';
  difficulty: Difficulty = 'normal';
  x = 195;
  y = 620;
  lives = 3;
  score = 0;
  round = 1;
  returning = false;
  invincible = 0;
  elapsed = 0;
  guardTime = 0;
  roundTime = 0;
  roundBonus = 0;
  private warned = false;
  crossed = new Set<string>();
  guards: Guard[] = [];
  input = { x: 0, y: 0 };
  constructor() { this.updateGuards(); }
  get tuning() { return courtTuning[this.difficulty]; }
  get roundLimit() { return Math.max(this.tuning.minSeconds, this.tuning.seconds - (this.round - 1) * 2); }
  get secondsLeft() { return Math.max(0, this.roundLimit - this.roundTime); }
  get guardPace() { return Math.min(this.tuning.maxPace, this.tuning.pace + (this.round - 1) * 0.09); }
  start(difficulty: Difficulty = this.difficulty) {
    this.difficulty = difficulty;
    this.phase = 'running'; this.x = 195; this.y = 620; this.lives = 3; this.score = 0;
    this.round = 1; this.returning = false; this.invincible = 0; this.elapsed = 0;
    this.guardTime = 0; this.roundTime = 0; this.roundBonus = 0; this.warned = false;
    this.crossed.clear(); this.input = { x: 0, y: 0 }; this.updateGuards();
  }
  pause() { if (this.phase === 'running') { this.phase = 'paused'; this.input = { x: 0, y: 0 }; } }
  resume() { if (this.phase === 'paused') this.phase = 'running'; }
  private updateGuards() {
    this.guards = Array.from({ length: 4 }, (_, i) => ({
      x: COURT.center + Math.sin(this.guardTime * (1 + i * 0.11) + i * 2.1) * 112,
      y: COURT.top + i * 115, vertical: false,
    }));
    this.guards.push({ x: COURT.center, y: 392 + Math.sin(this.guardTime * 0.8 + 0.8) * 150, vertical: true });
  }
  tick(dt: number): ('hit' | 'coin' | 'over' | 'turn' | 'round' | 'timeout' | 'warning')[] {
    if (this.phase !== 'running') return [];
    dt = Math.min(0.04, Math.max(0, dt));
    this.elapsed += dt; this.invincible = Math.max(0, this.invincible - dt);
    this.guardTime += dt * this.guardPace; this.roundTime += dt;
    const length = Math.hypot(this.input.x, this.input.y);
    if (length > 0) {
      this.x = Math.max(COURT.left + 12, Math.min(COURT.right - 12, this.x + this.input.x / Math.max(1, length) * 168 * dt));
      this.y = Math.max(175, Math.min(635, this.y + this.input.y / Math.max(1, length) * 168 * dt));
    }
    this.updateGuards();
    const events: ReturnType<PatinteroModel['tick']> = [];
    const timedOut = this.secondsLeft <= 0;
    if (timedOut || this.invincible === 0 && this.guards.some(g => Math.hypot(g.x - this.x, g.y - this.y) < this.tuning.tagRadius)) {
      this.lives--; this.invincible = 2;
      this.x = 195; this.y = 620; this.returning = false; this.crossed.clear();
      this.roundTime = 0; this.warned = false; events.push(timedOut ? 'timeout' : 'hit');
      if (this.lives === 0) { this.phase = 'over'; events.push('over'); }
      return events;
    }
    if (!this.warned && this.secondsLeft <= 10) { this.warned = true; events.push('warning'); }
    for (let i = 0; i < 4; i++) {
      const line = COURT.top + i * 115;
      const crossed = this.returning ? this.y > line + 18 : this.y < line - 18;
      const key = `${this.returning}-${i}`;
      if (crossed && !this.crossed.has(key)) { this.crossed.add(key); this.score += 25; events.push('coin'); }
    }
    if (!this.returning && this.y < 190) { this.returning = true; events.push('turn'); }
    if (this.returning && this.y > 610) {
      this.roundBonus = Math.floor(this.secondsLeft) * 2;
      this.score += 200 + this.roundBonus; this.round++; this.returning = false; this.crossed.clear();
      this.roundTime = 0; this.warned = false; events.push('round');
    }
    return events;
  }
}
