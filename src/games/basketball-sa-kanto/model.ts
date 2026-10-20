import { GameModel, clamp, type ControlScheme } from '../../core/game-model';
import { stepBasketball, type Impact } from './ball-physics';
export class BasketballModel extends GameModel {
    aim = 0;
    power = 0;
    baskets = 0;
    streak = 0;
    remaining = 18;
    ball = { x: 0, y: 2, z: 5, vx: 0, vy: 0, vz: 0 };
    hoop = { x: 0, y: 3.25, z: -4.5 };
    shooting = false;
    shotTime = 0;
    scored = false;
    player = { x: 0, z: 5.5 };
    walking = false;
    facing = 0;
    aimInput = 0;
    aimOffset = 0;
    lastImpact?: Impact;
    impactAt = -10;
    basketAt = -10;
    private chargeTime = 0;
    constructor() { super('basketball-sa-kanto'); }
    override get controls(): ControlScheme { return 'basketball'; }
    override get actionLabel() { return this.shooting ? 'WATCH THE SHOT' : 'HOLD & SHOOT'; }
    override get hudLabel() { return 'BUCKETS'; }
    override get hudValue() { return String(this.baskets).padStart(2, '0'); }
    override get secondary() { return this.score; }
    override get stageLabel() { return `ROUND ${this.stage} · ${Math.ceil(this.remaining)}s`; }
    override get progress() { return this.power; }
    override get objective() { return this.shooting ? this.scored ? 'Pasok! Nice basket.' : 'Follow the rebound…' : this.charging ? 'Feet set · release at the gold mark' : 'Move to your spot · hold SHOOT to set your feet'; }
    get releaseX() { return this.player.x; }
    get releaseZ() { return this.player.z - .5; }
    get shotSpeed() { return clamp(Math.hypot(this.hoop.x - this.releaseX, this.releaseZ - this.hoop.z) * .82, 4.8, 9.6); }
    get idealAim() { return Math.atan2(this.hoop.x - this.releaseX, this.releaseZ - this.hoop.z); }
    get idealPower() {
        const t = Math.hypot(this.hoop.x - this.releaseX, this.releaseZ - this.hoop.z) / this.shotSpeed;
        return clamp(((this.hoop.y - 2 + 4.9 * t * t) / t - 5.5) / 4, 0, 1);
    }
    get tolerance() { return [.1, .065, .04][this.mode]; }
    protected reset() { this.aim = 0; this.aimOffset = this.aimInput = 0; this.walking = false; this.facing = 0; this.player = { x: 0, z: 5.5 }; this.impactAt = this.basketAt = -10; this.lastImpact = undefined; this.baskets = 0; this.streak = 0; this.hoop = { x: 0, y: 3.25, z: -4.5 }; this.resetShot(); }
    private resetShot() {
        this.ball = { x: this.releaseX, y: 2, z: this.releaseZ, vx: 0, vy: 0, vz: 0 };
        this.shooting = false;
        this.scored = false;
        this.shotTime = 0;
        this.power = 0;
        this.charging = false;
        this.chargeTime = 0;
        this.remaining = Math.max(9, [22, 18, 14][this.mode] - (this.stage - 1));
    }
    override action(pressed: boolean) {
        if (this.phase !== 'running' || this.shooting)
            return;
        if (pressed) {
            this.walking = false;
            this.charging = true;
            this.chargeTime = 0;
            this.ball.x = this.releaseX; this.ball.y = 2; this.ball.z = this.releaseZ;
        }
        else if (this.charging) {
            this.charging = false;
            this.shooting = true;
            let aim = this.aim, power = this.power;
            // A readable green timing zone rewards good releases without requiring subpixel precision.
            if (Math.abs(power - this.idealPower) < this.tolerance && Math.abs(aim - this.idealAim) < .055) {
                aim = this.idealAim;
                power = this.idealPower;
            }
            this.ball.vx = Math.sin(aim) * this.shotSpeed;
            this.ball.vz = -Math.cos(aim) * this.shotSpeed;
            this.ball.vy = 5.5 + power * 4;
        }
    }
    override tap(x: number) { if (!this.shooting) this.aimOffset = clamp((x - .5) * .9, -.35, .35); }
    override pause() { super.pause(); this.aimInput = 0; this.walking = false; }
    protected update(dt: number) {
        if (!this.shooting) {
            const length = Math.hypot(this.input.x, this.input.y);
            this.walking = !this.charging && length > 0;
            if (this.walking) {
                this.player.x = clamp(this.player.x + this.input.x / Math.max(1, length) * 3.3 * dt, -4.5, 4.5);
                this.player.z = clamp(this.player.z + this.input.y / Math.max(1, length) * 3.3 * dt, .3, 6.6);
                this.facing = Math.atan2(this.input.x, -this.input.y);
            }
            this.aimOffset = clamp(this.aimOffset + this.aimInput * .45 * dt, -.35, .35);
            this.aim = this.idealAim + this.aimOffset;
            if (!this.walking) this.facing = this.aim;
            this.ball.x = this.releaseX + (this.walking ? .35 : 0);
            this.ball.z = this.releaseZ;
            this.ball.y = this.walking ? .25 + Math.abs(Math.sin(this.elapsed * 10)) * .95 : 2;
            this.remaining -= dt;
            if (this.charging) {
                this.chargeTime += dt;
                this.power = .5 - .5 * Math.cos(this.chargeTime * Math.PI * [1, 1.25, 1.5][this.mode]);
            }
            if (this.remaining <= 0) {
                this.lose('Shot clock! Take your chance.');
                this.streak = 0;
                this.resetShot();
            }
            return;
        }
        this.shotTime += dt;
        stepBasketball(this.ball, this.hoop, dt, () => {
            if (!this.scored) {
                this.scored = true;
                this.basketAt = this.elapsed;
                this.baskets++;
                this.streak++;
                this.award(100 + Math.min(100, this.streak * 10), 'Pasok! Keep the streak.');
            }
        }, impact => { this.lastImpact = impact; this.impactAt = this.elapsed; });
        if (this.shotTime > 2.6) {
            if (!this.scored) {
                this.lose('Sayang! Match the gold power mark and aim.');
                this.streak = 0;
            }
            if (this.scored && this.baskets % 3 === 0) {
                this.nextStage('Step back. Same sweet shot.');
                this.hoop.x = (this.random() - .5) * 3.2;
                this.hoop.z = -Math.min(6.2, 4.5 + this.stage * .25);
            }
            this.resetShot();
        }
    }
}
