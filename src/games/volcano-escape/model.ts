import { GameModel, clamp, type ControlScheme } from '../../core/game-model';
export type Ledge = {
    id: number;
    x: number;
    y: number;
    width: number;
    fragile: boolean;
    crumble: number;
};
export class VolcanoModel extends GameModel {
    x = 200;
    y = 105;
    vy = 0;
    facing = 1;
    grounded = 0;
    height = 0;
    camera = 0;
    lava = -90;
    platforms: Ledge[] = [];
    private nextId = 1;
    private checkpoint = { x: 200, y: 105 };
    private jumpBuffer = 0;
    constructor() { super('volcano-escape'); }
    override get controls(): ControlScheme { return 'platform'; }
    override get actionLabel() { return 'JUMP'; }
    override get hudLabel() { return 'HEIGHT'; }
    override get hudValue() { return `${Math.floor(this.height / 5)} m`; }
    override get secondary() { return this.score; }
    override get stageLabel() { return `RIDGE ${this.stage} · LAVA RISING`; }
    override get progress() { return this.height % 450 / 450; }
    override get objective() { return 'Jump to higher ledges · cracked rocks crumble'; }
    protected reset() {
        this.x = 200;
        this.y = 105;
        this.vy = 0;
        this.grounded = 0;
        this.height = 0;
        this.camera = 0;
        this.lava = -90;
        this.platforms = [{ id: 0, x: 200, y: 90, width: 190, fragile: false, crumble: 0 }];
        this.nextId = 1;
        this.checkpoint = { x: 200, y: 105 };
        this.jumpBuffer = 0;
        this.generate();
    }
    private generate() {
        while (this.platforms.at(-1)!.y < this.camera + 900) {
            const last = this.platforms.at(-1)!;
            const x = clamp(last.x + (this.random() < .5 ? -1 : 1) * (45 + this.random() * 45), 65, 335);
            this.platforms.push({ id: this.nextId++, x, y: last.y + 55 + this.random() * 12,
                width: Math.max(72, [112, 98, 86][this.mode] - this.stage * 2),
                fragile: this.nextId > 4 && this.nextId % 3 === 0, crumble: 0 });
        }
    }
    override action(pressed: boolean) { if (pressed && this.phase === 'running')
        this.jumpBuffer = .16; }
    protected update(dt: number) {
        this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
        if (this.jumpBuffer > 0 && this.grounded >= 0) {
            this.vy = 345;
            this.grounded = -1;
            this.jumpBuffer = 0;
        }
        this.x = clamp(this.x + this.input.x * 180 * dt, 18, 382);
        if (this.input.x)
            this.facing = Math.sign(this.input.x);
        const previousFeet = this.y - 15;
        this.y += this.vy * dt - 330 * dt * dt;
        this.vy -= 660 * dt;
        this.grounded = -1;
        if (this.vy <= 0) {
            for (const ledge of this.platforms) {
                if (ledge.crumble >= 1 || previousFeet < ledge.y || this.y - 15 > ledge.y || Math.abs(this.x - ledge.x) > ledge.width / 2 + 9)
                    continue;
                this.y = ledge.y + 15;
                this.vy = 0;
                this.grounded = ledge.id;
                if (ledge.fragile)
                    ledge.crumble += dt * 1.4;
                else
                    this.checkpoint = { x: ledge.x, y: this.y };
                break;
            }
        }
        for (const ledge of this.platforms)
            if (ledge.fragile && ledge.crumble > 0 && ledge.id !== this.grounded)
                ledge.crumble += dt * 1.4;
        this.height = Math.max(this.height, this.y - 105);
        this.points = Math.floor(this.height);
        const stage = 1 + Math.floor(this.height / 450);
        if (stage > this.stage) {
            this.stage = stage;
            this.events.push('round');
            this.notice = 'Higher ridge. The lava climbs faster.';
        }
        this.camera = Math.max(0, this.y - 290);
        this.lava += Math.min(28, [10, 15, 20][this.mode] + this.stage * 1.1) * dt;
        this.lava = Math.max(this.lava, this.camera - 160);
        if (this.y - 15 < this.lava || this.y < this.camera - 100) {
            if (this.lose('Lava caught up! Back to your last solid ledge.')) {
                this.x = this.checkpoint.x;
                this.y = this.checkpoint.y;
                this.vy = 0;
                this.lava = this.y - 200;
                this.camera = Math.max(0, this.y - 290);
            }
        }
        this.platforms = this.platforms.filter(p => p.y > Math.min(this.checkpoint.y - 30, this.camera - 200));
        this.generate();
    }
}
