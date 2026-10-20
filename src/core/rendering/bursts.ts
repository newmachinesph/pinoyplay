import * as T from 'three';

type Particle = { p: T.Vector3; v: T.Vector3; spin: T.Vector3; age: number; life: number; size: number; gravity: number };
export type BurstKind = 'confetti' | 'dust' | 'splash' | 'sparkle';
const STYLE: Record<BurstKind, { colors: number[]; speed: number; up: number; life: number; size: number; gravity: number }> = {
    confetti: { colors: [0xfcd116, 0xce1126, 0x0038a8, 0xffffff, 0x35b575], speed: 4, up: 6, life: 1.6, size: .16, gravity: 7 },
    dust: { colors: [0xd9c6a2, 0xc8b38c, 0xe7dbc3], speed: 1.6, up: 1.2, life: .7, size: .3, gravity: 1 },
    splash: { colors: [0xe8fbff, 0xbfeef2, 0xffffff], speed: 2.4, up: 4, life: .8, size: .2, gravity: 9 },
    sparkle: { colors: [0xfcd116, 0xffef9c, 0xffffff], speed: 2.8, up: 3.2, life: .6, size: .14, gravity: 4 },
};

/** Pooled particle bursts: one instanced mesh per world, particles shrink to nothing as they age. */
export class Bursts extends T.InstancedMesh {
    private particles: Particle[] = [];
    private cursor = 0;
    private dummy = new T.Object3D();
    private tint = new T.Color();
    private last = 0;

    constructor(capacity = 160) {
        super(new T.OctahedronGeometry(1, 0), new T.MeshBasicMaterial({ color: 0xffffff }), capacity);
        this.frustumCulled = false;
        this.instanceMatrix.setUsage(T.DynamicDrawUsage);
        for (let i = 0; i < capacity; i++) {
            this.particles.push({ p: new T.Vector3(), v: new T.Vector3(), spin: new T.Vector3(), age: 1, life: 0, size: 0, gravity: 0 });
            this.setColorAt(i, this.tint.setHex(0xffffff));
        }
        this.update(0);
    }

    emit(kind: BurstKind, at: T.Vector3Like, count: number): void {
        const s = STYLE[kind];
        for (let n = 0; n < count; n++) {
            const i = this.cursor++ % this.particles.length, p = this.particles[i];
            const a = Math.random() * Math.PI * 2, r = .4 + Math.random() * .6;
            p.p.set(at.x, at.y, at.z);
            p.v.set(Math.cos(a) * s.speed * r, s.up * (.5 + Math.random() * .5), Math.sin(a) * s.speed * r);
            p.spin.set(Math.random() * 8, Math.random() * 8, 0);
            p.age = 0;
            p.life = s.life * (.7 + Math.random() * .5);
            p.size = s.size * (.6 + Math.random() * .7);
            p.gravity = s.gravity;
            this.setColorAt(i, this.tint.setHex(s.colors[n % s.colors.length]));
        }
        this.instanceColor!.needsUpdate = true;
    }

    /** Advance by `dt`, or by wall-clock time when omitted (game clocks stop at game over). */
    update(dt?: number): void {
        const now = performance.now();
        dt ??= this.last ? Math.min(.05, (now - this.last) / 1000) : 0;
        this.last = now;
        this.particles.forEach((p, i) => {
            if (p.age < p.life) {
                p.age += dt;
                p.v.y -= p.gravity * dt;
                p.v.multiplyScalar(1 - Math.min(1, dt * 1.5));
                p.p.addScaledVector(p.v, dt);
            }
            const k = p.age < p.life ? 1 - p.age / p.life : 0;
            this.dummy.position.copy(p.p);
            this.dummy.rotation.set(p.spin.x * p.age, p.spin.y * p.age, 0);
            this.dummy.scale.set(p.size * k, p.size * k * .35, p.size * k);
            this.dummy.updateMatrix();
            this.setMatrixAt(i, this.dummy.matrix);
        });
        this.instanceMatrix.needsUpdate = true;
    }
}
