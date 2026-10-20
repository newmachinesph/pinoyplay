import { GameModel, clamp } from '../../core/game-model';
export type FallingFruit = {
    id: number;
    x: number;
    y: number;
    spin: number;
    kind: 'buko' | 'gold' | 'branch';
    speed: number;
};
export class CoconutModel extends GameModel {
    x = 200;
    caught = 0;
    combo = 0;
    wind = 0;
    items: FallingFruit[] = [];
    catches: { id: number; x: number; kind: 'buko' | 'gold'; at: number }[] = [];
    private spawnIn = .7;
    private nextId = 0;
    constructor() { super('coconut-catcher'); }
    override get hudLabel() { return 'BUKO'; }
    override get hudValue() { return String(this.caught).padStart(2, '0'); }
    override get secondary() { return this.score; }
    override get progress() { return this.caught % 12 / 12; }
    override get stageLabel() { return `HARVEST ${this.stage} · COMBO ${this.combo}`; }
    override get objective() { return 'Catch green buko · dodge falling branches'; }
    protected reset() { this.x = 200; this.caught = 0; this.combo = 0; this.wind = 0; this.items = []; this.catches = []; this.spawnIn = .7; this.nextId = 0; }
    override drag(x: number) { if (this.phase === 'running')
        this.x = clamp(x * 400, 42, 358); }
    protected update(dt: number) {
        this.x = clamp(this.x + this.input.x * 270 * dt, 42, 358);
        this.wind = Math.sin(this.elapsed * .32) * Math.min(30, this.stage * 5);
        this.catches = this.catches.filter(c => this.elapsed - c.at < .42);
        this.spawnIn -= dt;
        if (this.spawnIn <= 0) {
            const r = this.random();
            this.items.push({ id: this.nextId++, x: 55 + this.random() * 290, y: 100, spin: this.random() * 6,
                kind: r < .2 ? 'branch' : r > .93 ? 'gold' : 'buko', speed: Math.min(260, [100, 125, 150][this.mode] + this.stage * 10) });
            this.spawnIn = Math.max(.5, [1.35, 1.1, .9][this.mode] - this.stage * .04);
        }
        for (const item of this.items) {
            const before = item.y;
            item.y += item.speed * dt;
            item.x = clamp(item.x + this.wind * dt, 25, 375);
            item.spin += dt;
            if (before < 555 && item.y >= 555) {
                if (Math.abs(item.x - this.x) < 44) {
                    item.y = 800;
                    if (item.kind === 'branch') {
                        this.lose('Ingat! Branches don’t belong in the basket.');
                        this.combo = 0;
                    }
                    else {
                        this.catches.push({ id: item.id, x: item.x - this.x, kind: item.kind, at: this.elapsed });
                        this.caught++;
                        this.combo++;
                        this.award(item.kind === 'gold' ? 100 : 20 + Math.min(20, this.combo), item.kind === 'gold' ? 'Golden buko! +100' : 'Fresh buko!');
                        if (this.caught % 12 === 0)
                            this.nextStage('The wind is picking up.');
                    }
                }
            }
            if (item.y > 630 && item.y < 800 && item.kind !== 'branch') {
                item.y = 800;
                this.lose('Missed a buko. Watch where it falls.');
                this.combo = 0;
            }
        }
        this.items = this.items.filter(i => i.y < 700);
    }
}
