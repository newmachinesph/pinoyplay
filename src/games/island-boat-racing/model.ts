import { GameModel, clamp } from '../../core/game-model';
export type SeaGate = {
    id: number;
    x: number;
    z: number;
    width: number;
    checked: boolean;
};
export type SeaRock = {
    id: number;
    x: number;
    z: number;
    radius: number;
    hit: boolean;
};
export class BoatModel extends GameModel {
    x = 0;
    roll = 0;
    lateralVelocity = 0;
    heading = 0;
    private dragTarget?: number;
    distance = 0;
    passed = 0;
    combo = 0;
    speed = 11;
    gates: SeaGate[] = [];
    rocks: SeaRock[] = [];
    private nextId = 0;
    private spawnDistance = 0;
    private lastGateX = 0;
    constructor() { super('island-boat-racing'); }
    override get hudLabel() { return 'GATES'; }
    override get hudValue() { return String(this.passed).padStart(2, '0'); }
    override get secondary() { return this.score; }
    override get stageLabel() { return `LEG ${this.stage} · ${Math.floor(this.distance)} m`; }
    override get progress() { return this.passed % 5 / 5; }
    override get objective() { return this.combo >= 3 ? `${this.combo} gates in a row!` : 'Pass between the colored buoys'; }
    override get resultDetail() { return `${this.passed} gates · ${Math.floor(this.distance)} m`; }
    protected reset() {
        this.x = 0;
        this.roll = 0;
        this.lateralVelocity = 0;
        this.heading = 0;
        this.dragTarget = undefined;
        this.distance = 0;
        this.passed = 0;
        this.combo = 0;
        this.speed = [10, 12, 14][this.mode];
        this.gates = [];
        this.rocks = [];
        this.spawnDistance = 10;
        this.nextId = 0;
        this.lastGateX = 0;
    }
    override drag(x: number) { if (this.phase === 'running')
        this.dragTarget = clamp((x - .5) * 15, -6.4, 6.4); }
    protected update(dt: number) {
        this.speed = Math.min([20, 24, 27][this.mode], [10, 12, 14][this.mode] + this.distance / 240);
        if (this.input.x) this.dragTarget = undefined;
        const steer = this.dragTarget === undefined ? this.input.x : clamp((this.dragTarget - this.x) * 1.3, -1, 1);
        this.lateralVelocity += (steer * 7.2 - this.lateralVelocity) * (1 - Math.exp(-dt * 6));
        this.x = clamp(this.x + this.lateralVelocity * dt, -6.4, 6.4);
        if (Math.abs(this.x) === 6.4 && Math.sign(this.lateralVelocity) === Math.sign(this.x)) this.lateralVelocity = 0;
        this.heading += (-Math.atan2(this.lateralVelocity, this.speed) * .65 - this.heading) * (1 - Math.exp(-dt * 7));
        this.roll += (-this.lateralVelocity * .018 - this.roll) * (1 - Math.exp(-dt * 6));
        const travel = this.speed * dt;
        this.distance += travel;
        if (this.distance >= this.spawnDistance) {
            const x = clamp(this.lastGateX + (this.random() - .5) * 5, -4.1, 4.1);
            const width = Math.max(3.8, [6.2, 5.6, 5][this.mode] - (this.stage - 1) * .12);
            this.gates.push({ id: this.nextId++, x, width, z: -64, checked: false });
            // Rocks stay outside the gate's navigation corridor.
            const side = x > 0 ? -1 : 1;
            this.rocks.push({ id: this.nextId++, x: side * 5.8, z: -67, radius: .85, hit: false });
            this.lastGateX = x;
            this.spawnDistance += Math.max(28, 39 - this.stage * .4);
        }
        for (const gate of this.gates) {
            gate.z += travel;
            if (!gate.checked && gate.z >= 4) {
                gate.checked = true;
                if (Math.abs(this.x - gate.x) <= gate.width / 2 - 1.1) {
                    this.passed++;
                    this.combo++;
                    this.award(100 + Math.min(50, this.combo * 5), 'Lusot! Clean gate.');
                    if (this.passed % 5 === 0)
                        this.nextStage('Open water. Faster pace!');
                }
                else {
                    this.combo = 0;
                    this.lose('Missed the gate. Aim between the buoys.');
                }
            }
        }
        for (const rock of this.rocks) {
            rock.z += travel;
            if (!rock.hit && Math.abs(rock.z - 4) < 2 && Math.abs(this.x - rock.x) < rock.radius + .8) {
                rock.hit = true;
                this.combo = 0;
                this.lose('Ingat! Keep clear of the rocks.');
            }
        }
        this.gates = this.gates.filter(g => g.z < 20);
        this.rocks = this.rocks.filter(r => r.z < 20);
    }
}
