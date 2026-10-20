import { GameModel, clamp } from '../../core/game-model';
export type ParkingBlock = {
    x: number;
    z: number;
    width: number;
    length: number;
};
export class ParkingModel extends GameModel {
    x = 0;
    z = 6;
    heading = 0;
    speed = 0;
    parkedFor = 0;
    remaining = 85;
    parked = 0;
    bay = { x: -3.1, z: -5.4, width: 2.7, length: 4.3, heading: 0 };
    obstacles: ParkingBlock[] = [];
    constructor() { super('tricycle-parking'); this.layout(); }
    override get controls() { return 'parking' as const; }
    override get actionLabel() { return 'BRAKE'; }
    override get hudLabel() { return 'PARKED'; }
    override get hudValue() { return String(this.parked).padStart(2, '0'); }
    override get secondary() { return this.score; }
    override get stageLabel() { return `${Math.ceil(this.remaining)}s · BAY ${this.stage}`; }
    override get progress() { return this.parkedFor ? this.parkedFor / 1.15 : this.remaining / this.timeLimit; }
    override get objective() { return this.parkedFor > 0 ? 'Hold still… sakto!' : 'Stop inside the yellow bay'; }
    override get resultDetail() { return `${this.parked} perfect parks`; }
    get timeLimit() { return Math.max(38, [100, 85, 65][this.mode] - (this.stage - 1) * 4); }
    protected reset() { this.parked = 0; this.layout(); }
    private layout() {
        this.x = 0;
        this.z = 6.5;
        this.heading = 0;
        this.speed = 0;
        this.parkedFor = 0;
        this.remaining = this.timeLimit;
        const side = this.stage % 2 ? -1 : 1;
        this.bay = { x: side * 3.1, z: -5.3, width: [2.9, 2.65, 2.4][this.mode], length: 4.3, heading: this.stage % 4 === 0 ? Math.PI : 0 };
        this.obstacles = [
            { x: -side * 3.2, z: -5.3, width: 2, length: 3.5 },
            { x: 0, z: -0.5, width: 1.9, length: 3.2 },
        ];
        if (this.stage >= 3)
            this.obstacles.push({ x: -side * 4, z: 3.5, width: 1.7, length: 2.8 });
    }
    /** Four corners make parking and curb contact agree with the visible vehicle. */
    get corners() {
        const c = Math.cos(this.heading), s = Math.sin(this.heading);
        return [-0.85, 0.85].flatMap(x => [-1.35, 1.35].map(z => ({ x: this.x + x * c - z * s, z: this.z + x * s + z * c })));
    }
    private collides() {
        if (this.corners.some(p => Math.abs(p.x) > 6.35 || Math.abs(p.z) > 9.1))
            return true;
        const c = Math.cos(this.heading), s = Math.sin(this.heading);
        return this.obstacles.some(o => {
            const dx = o.x - this.x, dz = o.z - this.z;
            // SAT: two world axes and two vehicle axes.
            return Math.abs(dx) < o.width / 2 + Math.abs(c) * .85 + Math.abs(s) * 1.35
                && Math.abs(dz) < o.length / 2 + Math.abs(s) * .85 + Math.abs(c) * 1.35
                && Math.abs(dx * c + dz * s) < .85 + Math.abs(c) * o.width / 2 + Math.abs(s) * o.length / 2
                && Math.abs(-dx * s + dz * c) < 1.35 + Math.abs(s) * o.width / 2 + Math.abs(c) * o.length / 2;
        });
    }
    protected update(dt: number) {
        this.remaining = Math.max(0, this.remaining - dt);
        if (this.remaining === 0) {
            if (this.lose('Time’s up. Try the bay again.'))
                this.layout();
            return;
        }
        const old = { x: this.x, z: this.z, heading: this.heading };
        const throttle = -this.input.y;
        this.speed = clamp(this.speed + throttle * 4.5 * dt, -2.5, 4.5);
        if (!throttle)
            this.speed *= Math.exp(-1.8 * dt);
        if (this.charging)
            this.speed *= Math.exp(-10 * dt);
        this.heading += this.input.x * this.speed * .48 * dt;
        this.x += Math.sin(this.heading) * this.speed * dt;
        this.z -= Math.cos(this.heading) * this.speed * dt;
        if (this.collides()) {
            Object.assign(this, old);
            this.speed = 0;
            this.lose('Dahan-dahan! Watch the curb and parked cars.');
        }
        const aligned = Math.abs(Math.sin(this.heading - this.bay.heading)) < .17;
        const inside = this.corners.every(p => Math.abs(p.x - this.bay.x) < this.bay.width / 2 && Math.abs(p.z - this.bay.z) < this.bay.length / 2);
        this.parkedFor = inside && aligned && Math.abs(this.speed) < .22 ? this.parkedFor + dt : 0;
        if (this.parkedFor >= 1.15) {
            this.parked++;
            this.award(250 + Math.floor(this.remaining) * 2);
            this.nextStage('Sakto! Perfect parking.');
            this.layout();
        }
    }
}
