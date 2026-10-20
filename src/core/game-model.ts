import type { Difficulty } from './difficulty';
import type { GameId } from '../catalog';
import type { Phase } from '../games/jeepney-rush/model';
export type SinglePlayerGameId = Exclude<GameId, 'jeepney-rush' | 'patintero'>;
export type GameEvent = 'coin' | 'hit' | 'over' | 'round' | 'warning' | 'success';
export type ControlScheme = 'parking' | 'steer' | 'aim' | 'court' | 'tap' | 'recipe' | 'platform' | 'basketball';
export const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const modeNumber = (mode: Difficulty) => mode === 'easy' ? 0 : mode === 'normal' ? 1 : 2;
/** Renderer-independent lifecycle shared by eight games with distinct rules. */
export abstract class GameModel {
    phase: Phase = 'ready';
    difficulty: Difficulty = 'normal';
    lives = 3;
    stage = 1;
    points = 0;
    elapsed = 0;
    invincible = 0;
    input = { x: 0, y: 0 };
    charging = false;
    notice = '';
    protected events: GameEvent[] = [];
    constructor(readonly id: SinglePlayerGameId, public random = Math.random) { }
    get score() { return Math.floor(this.points); }
    get mode() { return modeNumber(this.difficulty); }
    get controls(): ControlScheme { return 'steer'; }
    get actionLabel() { return 'GO'; }
    get hudLabel() { return 'SCORE'; }
    get hudValue() { return String(this.score); }
    get secondary() { return this.stage; }
    get stageLabel() { return `LEVEL ${this.stage}`; }
    get progress() { return 0; }
    get objective() { return ''; }
    get resultDetail() { return `Level ${this.stage}`; }
    start(difficulty: Difficulty = this.difficulty) {
        this.difficulty = difficulty;
        this.phase = 'running';
        this.lives = 3;
        this.stage = 1;
        this.points = 0;
        this.elapsed = 0;
        this.invincible = 0;
        this.input = { x: 0, y: 0 };
        this.charging = false;
        this.events = [];
        this.notice = '';
        this.reset();
    }
    pause() {
        if (this.phase !== 'running')
            return;
        this.phase = 'paused';
        this.input = { x: 0, y: 0 };
        this.charging = false;
    }
    resume() { if (this.phase === 'paused')
        this.phase = 'running'; }
    tick(dt: number): GameEvent[] {
        if (this.phase === 'running') {
            dt = clamp(dt, 0, 0.04);
            this.elapsed += dt;
            this.invincible = Math.max(0, this.invincible - dt);
            this.update(dt);
        }
        const pending = this.events;
        this.events = [];
        return pending;
    }
    action(pressed: boolean) { if (this.phase === 'running')
        this.charging = pressed; }
    tap(_x: number, _y: number) { }
    drag(_x: number) { }
    choose(_index: number) { }
    undo() { }
    protected award(points: number, message = '') {
        this.points += points;
        this.notice = message;
        this.events.push('coin');
    }
    protected lose(message: string) {
        if (this.invincible > 0 || this.phase !== 'running')
            return false;
        this.lives--;
        this.invincible = 1.3;
        this.notice = message;
        this.charging = false;
        this.events.push('hit');
        if (this.lives <= 0) {
            this.phase = 'over';
            this.events.push('over');
        }
        return true;
    }
    protected nextStage(message: string) {
        this.stage++;
        this.notice = message;
        this.events.push('round');
    }
    protected abstract reset(): void;
    protected abstract update(dt: number): void;
}
