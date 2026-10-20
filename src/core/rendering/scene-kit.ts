import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeStatic } from '../../games/jeepney-rush/jeepney';
export type Surface = 'asphalt' | 'dirt' | 'concrete' | 'court';
const surfaces: Record<Surface, { base: string; light: string; dark: string; cracks: number; blotch: string }> = {
    asphalt: { base: '#59626a', light: '#7c858b', dark: '#3d454c', cracks: 10, blotch: '#2f363c' },
    dirt: { base: '#c3a67c', light: '#dcc49b', dark: '#9c8058', cracks: 0, blotch: '#a98c63' },
    concrete: { base: '#cfc6b2', light: '#e2dac7', dark: '#aaa18c', cracks: 14, blotch: '#b8ae98' },
    court: { base: '#2d8088', light: '#4b9aa0', dark: '#21656c', cracks: 6, blotch: '#286f76' },
};
/** Seeded, so every visit draws the same ground. */
function random(seed: number) {
    return () => {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** Tileable worn-ground texture drawn on a canvas (no download). */
export function surfaceTexture(kind: Surface, repeat: [number, number]): T.CanvasTexture {
    const s = surfaces[kind], size = 512, rnd = random(kind.length * 977);
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = s.base;
    ctx.fillRect(0, 0, size, size);
    // Draw each mark at the 3x3 wrapped offsets so the tile repeats seamlessly.
    const wrapped = (draw: (dx: number, dy: number) => void) => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) draw(dx, dy); };
    for (let i = 0; i < 26; i++) {
        const x = rnd() * size, y = rnd() * size, r = 30 + rnd() * 90, alpha = .08 + rnd() * .12;
        wrapped((dx, dy) => {
            const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
            g.addColorStop(0, s.blotch + Math.round(alpha * 255).toString(16).padStart(2, '0'));
            g.addColorStop(1, s.blotch + '00');
            ctx.fillStyle = g;
            ctx.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
        });
    }
    for (let i = 0; i < 9000; i++) {
        ctx.fillStyle = rnd() > .5 ? s.light : s.dark;
        ctx.globalAlpha = .15 + rnd() * .35;
        const w = 1 + rnd() * 2.2;
        ctx.fillRect(rnd() * size, rnd() * size, w, w);
    }
    ctx.globalAlpha = .35;
    ctx.strokeStyle = s.dark;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < s.cracks; i++) {
        let x = rnd() * size, y = rnd() * size;
        const path: number[][] = [[x, y]];
        for (let n = 0; n < 7; n++) path.push([x += (rnd() - .5) * 46, y += (rnd() - .5) * 46]);
        wrapped((dx, dy) => {
            ctx.beginPath();
            path.forEach(([px, py], n) => n ? ctx.lineTo(px + dx, py + dy) : ctx.moveTo(px + dx, py + dy));
            ctx.stroke();
        });
    }
    ctx.globalAlpha = 1;
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    texture.anisotropy = 4;
    return texture;
}
/** Vertical sky gradient for scene.background; the horizon colour should match the fog. */
export function skyTexture(top: string, horizon: string): T.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 2;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, top);
    g.addColorStop(.62, horizon);
    g.addColorStop(1, horizon);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2, 256);
    const texture = new T.CanvasTexture(c);
    texture.colorSpace = T.SRGBColorSpace;
    return texture;
}
/** Authored scene parts; each kit owns its materials so disposal is isolated. */
export class SceneKit {
    /** A box whose top face shows a worn surface texture. */
    ground(parent: T.Object3D, kind: Surface, size: number[], at: number[], tile = 4) {
        const mesh = new T.Mesh(new T.BoxGeometry(size[0], size[1], size[2]),
            new T.MeshStandardMaterial({ map: surfaceTexture(kind, [size[0] / tile, size[2] / tile]), roughness: kind === 'court' ? .7 : .95 }));
        mesh.position.set(at[0], at[1], at[2]);
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    materials = new Map<number, T.MeshStandardMaterial>();
    mat(color: number) {
        if (!this.materials.has(color))
            this.materials.set(color, new T.MeshStandardMaterial({
                color, roughness: color === 0xcbdadd ? .24 : .72, metalness: color === 0xcbdadd ? .8 : .03,
            }));
        return this.materials.get(color)!;
    }
    mesh(parent: T.Object3D, geo: T.BufferGeometry, color: number, at = [0, 0, 0]) {
        const mesh = new T.Mesh(geo, this.mat(color));
        mesh.position.set(at[0], at[1], at[2]);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    box(parent: T.Object3D, color: number, size: number[], at: number[], radius = .035) {
        return this.mesh(parent, new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(radius, ...size.map(v => v / 3))), color, at);
    }
    sphere(parent: T.Object3D, color: number, radius: number, at: number[], scale = [1, 1, 1]) {
        const m = this.mesh(parent, new T.SphereGeometry(radius, 14, 10), color, at);
        m.scale.set(scale[0], scale[1], scale[2]);
        return m;
    }
    cylinder(parent: T.Object3D, color: number, r: number, length: number, at: number[], axis = 'y') {
        const m = this.mesh(parent, new T.CylinderGeometry(r, r, length, 16), color, at);
        if (axis === 'x')
            m.rotation.z = Math.PI / 2;
        if (axis === 'z')
            m.rotation.x = Math.PI / 2;
        return m;
    }
    pipe(parent: T.Object3D, color: number, points: number[][], radius = .035) {
        return this.mesh(parent, new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p => new T.Vector3(p[0], p[1], p[2]))), Math.max(6, points.length * 4), radius, 6, false), color);
    }
    label(parent: T.Object3D, text: string, width: number, height: number, at: number[], bg = '#fff3cc', fg = '#153853') {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 128;
        const ctx = c.getContext('2d')!;
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 512, 128);
        ctx.strokeStyle = fg;
        ctx.lineWidth = 5;
        ctx.strokeRect(8, 8, 496, 112);
        ctx.fillStyle = fg;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '800 65px "Barlow Condensed", sans-serif';
        ctx.fillText(text, 256, 68, 480);
        const map = new T.CanvasTexture(c);
        map.colorSpace = T.SRGBColorSpace;
        const m = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map, side: T.DoubleSide, roughness: .8 }));
        m.position.set(at[0], at[1], at[2]);
        parent.add(m);
        return m;
    }
    palm(parent: T.Object3D, x: number, z: number, h = 5) {
        const g = new T.Group();
        g.position.set(x, 0, z);
        parent.add(g);
        this.pipe(g, 0x897151, [[0, 0, 0], [.15, h * .55, 0], [.4, h, .1]], .15);
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4, d = new T.Vector3(Math.sin(a), 0, Math.cos(a));
            const shape = new T.Shape();
            shape.moveTo(0, 0);
            shape.quadraticCurveTo(.7, 1.1, 0, 2.8);
            shape.quadraticCurveTo(-.5, 1, 0, 0);
            const leaf = this.mesh(g, new T.ShapeGeometry(shape, 8), i % 2 ? 0x347d55 : 0x4c9959, [.4, h, .1]);
            leaf.material.side = T.DoubleSide;
            leaf.rotation.set(-1.1, 0, -a);
            leaf.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(d.x, .12, d.z).normalize());
            this.pipe(g, 0x97af5d, [[.4, h, .1], [.4 + d.x, h + .2, .1 + d.z], [.4 + d.x * 2.6, h - .3, .1 + d.z * 2.6]], .018);
        }
        for (let i = 0; i < 3; i++)
            this.sphere(g, 0x839547, .22, [.2 + i * .2, h - .2, .1]);
        mergeStatic(g);
    }
    /** Ground, sidewalks and overhead lines of the shared lane; buildings come from dressBarangay. */
    neighborhood(parent: T.Object3D, kind: 'parking' | 'court') {
        const g = new T.Group();
        parent.add(g);
        this.ground(g, 'concrete', [34, .3, 34], [0, -.26, -3], 3);
        for (const side of [-1, 1]) {
            this.box(g, 0xdad2bd, [2.2, .25, 24], [side * 7.6, -.02, -1]);
            for (let i = 0; i < 6; i++)
                this.box(g, i % 2 ? 0xf3d464 : 0x263e4e, [.25, .22, 1.4], [side * 6.6, .05, -8 + i * 3.2]);
        }
        for (const z of [-10]) {
            this.pipe(g, 0x49515a, [[-11, 6, z], [0, 5.3, z], [11, 6, z]], .025);
            for (let i = 0; i < 16; i++) {
                const x = -10 + i * 1.3, y = 5.3 + Math.abs(x) * .06;
                this.sphere(g, 0xffd986, .16, [x, y - .19, z], [1, 1.3, 1]);
            }
        }
        if (kind === 'parking') {
            this.label(g, 'TRICYCLE TERMINAL', 6, .95, [0, 2.6, -10.2]);
            for (const x of [-2.85, 2.85])
                this.cylinder(g, 0x49515a, .07, 3.1, [x, 1.45, -10.25]);
        }
        // Keep independently textured signs intact; merge simple direct meshes by material.
        mergeStatic(g);
    }
}
export class StreetKid extends T.Group {
    private arms: T.Group[] = [];
    private legs: T.Group[] = [];
    constructor(kit: SceneKit, shirt: number, cap = false) {
        super();
        const skin = 0xb97a51, shorts = 0x253d55;
        kit.box(this, shirt, [.58, .64, .34], [0, 1.05, 0], .13);
        kit.sphere(this, skin, .27, [0, 1.62, -.025], [1, 1.12, .95]);
        kit.sphere(this, 0x202329, .275, [0, 1.76, .015], [1, .55, 1]);
        if (cap) {
            kit.sphere(this, 0xf2c348, .29, [0, 1.78, 0], [1, .48, 1]);
            kit.box(this, 0xf2c348, [.4, .04, .25], [0, 1.76, -.3], .04);
        }
        for (const x of [-.1, .1])
            kit.sphere(this, 0x22232b, .027, [x, 1.65, -.27]);
        kit.sphere(this, skin, .065, [0, 1.57, -.285]);
        for (const side of [-1, 1]) {
            const arm = new T.Group();
            arm.position.set(side * .35, 1.28, 0);
            this.add(arm);
            kit.box(arm, shirt, [.2, .26, .25], [0, -.08, 0], .07);
            kit.cylinder(arm, skin, .075, .32, [0, -.35, 0]);
            kit.sphere(arm, skin, .085, [0, -.52, -.015]);
            this.arms.push(arm);
            const leg = new T.Group();
            leg.position.set(side * .16, .8, 0);
            this.add(leg);
            kit.box(leg, shorts, [.26, .3, .3], [0, -.12, 0], .05);
            kit.cylinder(leg, skin, .08, .35, [0, -.43, 0]);
            kit.box(leg, 0xf1e6c9, [.22, .14, .38], [0, -.68, -.08], .06);
            this.legs.push(leg);
        }
        mergeStatic(this);
        for (const limb of [...this.arms, ...this.legs])
            mergeStatic(limb);
    }
    pose(time: number, moving: boolean, facing: number, throwPower = 0) {
        this.rotation.y = -facing;
        this.position.y = moving ? Math.abs(Math.sin(time * 12)) * .07 : 0;
        this.legs.forEach((leg, i) => leg.rotation.x = moving ? Math.sin(time * 12 + i * Math.PI) * .65 : 0);
        this.arms.forEach((arm, i) => arm.rotation.x = throwPower ? throwPower * 2.3 : moving ? Math.sin(time * 12 + i * Math.PI) * -.65 : .05);
    }
}
