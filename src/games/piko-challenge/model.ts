import { GameModel, type ControlScheme } from '../../core/game-model';
export const pikoSquares = [
    { n: 1, x: 200, y: 480 }, { n: 2, x: 200, y: 420 },
    { n: 3, x: 158, y: 360 }, { n: 4, x: 242, y: 360 },
    { n: 5, x: 200, y: 300 }, { n: 6, x: 158, y: 240 },
    { n: 7, x: 242, y: 240 }, { n: 8, x: 200, y: 180 },
];
export const pikoSequence = [1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1];
export class PikoModel extends GameModel {
    step = 0;
    combo = 0;
    hops = 0;
    remaining = 2.4;
    hop = 1;
    position = { x: 200, y: 545 };
    from = { ...this.position };
    to = { ...this.position };
    constructor() { super('piko-challenge'); }
    override get controls(): ControlScheme { return 'tap'; }
    get target() { return pikoSquares[pikoSequence[this.step] - 1]; }
    get limit() { return Math.max(.8, [3.1, 2.4, 1.8][this.mode] - (this.stage - 1) * .15); }
    override get hudLabel() { return 'HOPS'; }
    override get hudValue() { return String(this.hops); }
    override get secondary() { return this.score; }
    override get progress() { return this.remaining / this.limit; }
    override get objective() { return `Tap glowing square ${this.target.n} · ${this.step < 8 ? 'going out' : 'coming home'}`; }
    override get stageLabel() { return `ROUND ${this.stage} · COMBO ${this.combo}`; }
    protected reset() { this.step = 0; this.combo = 0; this.hops = 0; this.remaining = this.limit; this.hop = 1; this.position = { x: 200, y: 545 }; }
    override tap(x: number, y: number) {
        if (this.phase !== 'running' || this.hop < 1)
            return;
        const square = pikoSquares.find(s => Math.abs(x * 400 - s.x) < 39 && Math.abs(y * 700 - s.y) < 28);
        if (!square)
            return;
        this.choose(square.n);
    }
    override choose(n: number) {
        if (this.phase !== 'running' || this.hop < 1)
            return;
        if (n !== this.target.n) {
            if (this.lose('Mali! Follow the glowing number.'))
                this.combo = 0;
            this.remaining = this.limit;
            return;
        }
        this.combo++;
        this.hops++;
        this.award(20 + Math.min(30, this.combo * 2), 'Sakto!');
        this.from = { ...this.position };
        this.to = { x: this.target.x, y: this.target.y };
        this.hop = 0;
    }
    protected update(dt: number) {
        if (this.hop < 1) {
            this.hop = Math.min(1, this.hop + dt * 3.8);
            const t = this.hop * this.hop * (3 - 2 * this.hop);
            this.position = { x: this.from.x + (this.to.x - this.from.x) * t, y: this.from.y + (this.to.y - this.from.y) * t };
            if (this.hop === 1) {
                this.step++;
                if (this.step === pikoSequence.length) {
                    this.step = 0;
                    this.award(150, 'Balik-bahay! Round complete.');
                    this.nextStage('A quicker chalk trail.');
                }
                this.remaining = this.limit;
            }
        }
        else {
            this.remaining -= dt;
            if (this.remaining <= 0) {
                this.lose('Too slow! Watch the shrinking ring.');
                this.combo = 0;
                this.remaining = this.limit;
            }
        }
    }
}
