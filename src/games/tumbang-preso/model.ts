import { GameModel, clamp, type ControlScheme } from '../../core/game-model';
export class TumbangModel extends GameModel {
    turn: 'aim' | 'flight' | 'retrieve' = 'aim';
    x = 0;
    z = 6;
    facing = 0;
    aim = 0;
    power = 0;
    can = { x: 0, z: -3.5, fallen: false };
    slipper = { x: 0, y: .1, z: 6, collected: false };
    guard = { x: 4, z: -5, facing: 0 };
    remaining = 12;
    knocked = 0;
    flight = 0;
    private chargeTime = 0;
    private retrievalTime = 0;
    private end = { x: 0, z: 0 };
    constructor() { super('tumbang-preso'); }
    override get controls(): ControlScheme { return this.turn === 'retrieve' ? 'court' : 'aim'; }
    override get actionLabel() { return this.turn === 'aim' ? 'HOLD & THROW' : this.turn === 'flight' ? 'IN FLIGHT' : 'GET HOME'; }
    override get hudLabel() { return 'CANS'; }
    override get hudValue() { return String(this.knocked).padStart(2, '0'); }
    override get secondary() { return this.score; }
    override get progress() { return this.turn === 'aim' ? this.power : this.remaining / [14, 12, 10][this.mode]; }
    override get stageLabel() { return this.turn === 'retrieve' ? `${Math.ceil(this.remaining)}s · GET HOME` : `ROUND ${this.stage}`; }
    override get objective() {
        return this.turn === 'aim' ? 'Aim at the can · release near the gold mark' :
            this.turn === 'flight' ? 'Tsinelas in flight…' : this.slipper.collected ? 'Slipper found! Run home ↓' : 'Get your slipper · avoid the red-shirt guard';
    }
    get idealPower() { return clamp((Math.hypot(this.can.x, this.can.z - 6) - 5) / 8, 0, 1); }
    get target() {
        const distance = 5 + this.power * 8;
        return { x: Math.sin(this.aim) * distance, z: 6 - Math.cos(this.aim) * distance };
    }
    protected reset() { this.knocked = 0; this.setup(); }
    private setup() {
        this.turn = 'aim';
        this.x = 0;
        this.z = 6;
        this.aim = 0;
        this.power = 0;
        this.chargeTime = 0;
        this.can = { x: this.stage === 1 ? 0 : (this.random() - .5) * 3, z: -3.5, fallen: false };
        this.slipper = { x: 0, y: .15, z: 6, collected: false };
        this.guard = { x: this.can.x > 0 ? -4.5 : 4.5, z: -5, facing: 0 };
        this.remaining = [14, 12, 10][this.mode];
        this.retrievalTime = 0;
    }
    override action(pressed: boolean) {
        if (this.phase !== 'running' || this.turn !== 'aim')
            return;
        if (pressed) {
            this.charging = true;
            this.chargeTime = 0;
        }
        else if (this.charging) {
            this.charging = false;
            this.end = this.target;
            this.turn = 'flight';
            this.flight = 0;
        }
    }
    override tap(x: number) { if (this.turn === 'aim')
        this.aim = clamp((x - .5) * 1.1, -.5, .5); }
    protected update(dt: number) {
        if (this.turn === 'aim') {
            this.aim = clamp(this.aim + this.input.x * .65 * dt, -.5, .5);
            if (this.charging) {
                this.chargeTime += dt;
                this.power = .5 - .5 * Math.cos(this.chargeTime * Math.PI * [1, 1.2, 1.4][this.mode]);
            }
        }
        else if (this.turn === 'flight') {
            this.flight = Math.min(1, this.flight + dt * 1.5);
            this.slipper.x = this.end.x * this.flight;
            this.slipper.z = 6 + (this.end.z - 6) * this.flight;
            this.slipper.y = .15 + Math.sin(this.flight * Math.PI) * 2.8;
            if (this.flight === 1) {
                if (Math.hypot(this.end.x - this.can.x, this.end.z - this.can.z) < [.95, .8, .65][this.mode]) {
                    this.can.fallen = true;
                    this.knocked++;
                    this.award(25, 'Tumba! Retrieve your tsinelas.');
                    this.turn = 'retrieve';
                    this.input = { x: 0, y: 0 };
                }
                else {
                    this.lose('Almost! Adjust the aim and throwing power.');
                    this.setup();
                }
            }
        }
        else {
            this.remaining -= dt;
            this.retrievalTime += dt;
            const length = Math.max(1, Math.hypot(this.input.x, this.input.y));
            this.x = clamp(this.x + this.input.x / length * 4.8 * dt, -5.5, 5.5);
            this.z = clamp(this.z + this.input.y / length * 4.8 * dt, -6.5, 6.5);
            if (this.input.x || this.input.y)
                this.facing = Math.atan2(this.input.x, -this.input.y);
            if (Math.hypot(this.x - this.slipper.x, this.z - this.slipper.z) < 1)
                this.slipper.collected = true;
            if (this.retrievalTime > 2.8) {
                const dx = this.x - this.guard.x, dz = this.z - this.guard.z, d = Math.hypot(dx, dz) || 1;
                const speed = Math.min(3.3, [1.6, 2, 2.4][this.mode] + this.stage * .07);
                this.guard.x += dx / d * speed * dt;
                this.guard.z += dz / d * speed * dt;
                this.guard.facing = Math.atan2(dx, -dz);
                if (d < .8) {
                    this.lose('Taya! The guard caught you.');
                    this.setup();
                    return;
                }
            }
            if (this.slipper.collected && this.z > 5.5) {
                this.award(100 + Math.ceil(this.remaining) * 5, 'Lusot! Safe at home.');
                this.nextStage('Another can, another diskarte.');
                this.setup();
            }
            else if (this.remaining <= 0) {
                this.lose('Time’s up. Get the slipper and run home.');
                this.setup();
            }
        }
    }
}
