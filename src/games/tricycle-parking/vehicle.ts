import * as T from 'three';
import { SceneKit, StreetKid } from '../../core/rendering/scene-kit';
import { mergeStatic } from '../jeepney-rush/jeepney';
export class Tricycle extends T.Group {
    wheels: T.Group[] = [];
    fork = new T.Group();
    constructor(kit: SceneKit, paint = 0x1659b1) {
        super();
        const chrome = 0xcbdadd, tire = 0x1d2b34, yellow = 0xf4cc53;
        const shell = new T.Group();
        this.add(shell);
        kit.box(shell, tire, [.75, .13, 1.75], [-.44, .45, 0], .03);
        kit.box(shell, paint, [.4, .4, .7], [-.48, .87, -.35], .17);
        kit.box(shell, tire, [.4, .12, .85], [-.48, .99, .2], .07);
        kit.cylinder(shell, 0x72828a, .2, .33, [-.48, .55, -.05], 'x');
        kit.pipe(shell, chrome, [[-.67, .42, .68], [-.72, .4, .12], [-.72, .52, -.12]], .045);
        for (const z of [-.55, .6])
            kit.pipe(shell, chrome, [[-.3, .4, z], [.7, .4, z]], .045);
        // Open sidecar cabin: floor, sculpted nose, rear, seat, pillars and curved roof.
        kit.box(shell, paint, [1, .3, 1.85], [.37, .52, .12], .15);
        kit.box(shell, paint, [1, .48, .5], [.37, .83, -.64], .18);
        kit.box(shell, paint, [1, .7, .17], [.37, 1.03, .94], .06);
        kit.box(shell, 0x7d3633, [.8, .18, .6], [.37, .8, .38], .08);
        kit.box(shell, 0x7d3633, [.78, .5, .14], [.37, 1.05, .7], .05);
        kit.box(shell, yellow, [1.1, .15, 2.05], [.37, 1.76, .1], .1);
        for (const x of [-.12, .86])
            for (const z of [-.75, .94])
                kit.pipe(shell, chrome, [[x, .64, z], [x, 1.7, z]], .027);
        const glass = kit.box(shell, 0x93c4d0, [.9, .58, .035], [.37, 1.4, -.78], .01);
        const glassMat = new T.MeshPhysicalMaterial({ color: 0x82c4d4, transparent: true, opacity: .5, roughness: .1, metalness: .25, side: T.DoubleSide });
        glass.material = glassMat;
        kit.pipe(shell, chrome, [[.86, 1.14, -.48], [.86, 1.14, .72]], .025);
        kit.box(shell, chrome, [1.08, .08, .12], [.37, .48, -1], .035);
        kit.box(shell, 0xfce0a0, [.2, .14, .06], [.68, .86, -.91], .04);
        kit.box(shell, 0xcb3b32, [.17, .16, .05], [.68, .7, 1.04], .03);
        kit.pipe(shell, chrome, [[-.65, 1.08, -.65], [-.65, 1.3, -.7], [-.3, 1.3, -.7]], .025);
        for (const side of [-1, 1])
            kit.sphere(shell, chrome, .09, [-.48 + side * .3, 1.48, -.68], [1, .8, .3]);
        const plate = kit.label(shell, 'PINOY 08', .51, .14, [.4, .6, 1.047]);
        plate.rotation.y = 0;
        mergeStatic(shell);
        this.fork.position.set(-.48, .36, -.95);
        this.add(this.fork);
        kit.pipe(this.fork, chrome, [[-.12, 0, 0], [-.12, .75, .12]], .03);
        kit.pipe(this.fork, chrome, [[.12, 0, 0], [.12, .75, .12]], .03);
        kit.sphere(this.fork, 0xffe8a9, .14, [0, .69, -.055], [1, 1, .5]);
        this.wheel(kit, this.fork, [0, 0, 0]);
        this.wheel(kit, this, [-.48, .36, .78]);
        this.wheel(kit, this, [.92, .36, .5]);
        const rider = new StreetKid(kit, 0xc84438);
        rider.scale.setScalar(.65);
        rider.position.set(-.48, .65, .1);
        this.add(rider);
        // Bend knees and extend arms into a seated riding silhouette.
        rider.rotation.x = -.12;
        rider.pose(0, false, 0, .4);
        kit.box(this, yellow, [.75, .08, 1.8], [-.45, 1.89, .05], .06);
        for (const z of [-.7, .85])
            kit.pipe(this, chrome, [[-.82, .7, z], [-.82, 1.87, z]], .025);
    }
    private wheel(kit: SceneKit, parent: T.Object3D, at: number[]) {
        const g = new T.Group();
        g.position.set(at[0], at[1], at[2]);
        parent.add(g);
        kit.cylinder(g, 0x1d2b34, .34, .18, [0, 0, 0], 'x');
        for (const side of [-1, 1]) {
            kit.cylinder(g, 0xcbdadd, .23, .018, [side * .1, 0, 0], 'x');
            kit.cylinder(g, 0x516270, .14, .02, [side * .115, 0, 0], 'x');
            for (let i = 0; i < 6; i++) {
                const a = i * Math.PI / 3;
                kit.pipe(g, 0xcbdadd, [[side * .13, 0, 0], [side * .13, Math.cos(a) * .2, Math.sin(a) * .2]], .012);
            }
        }
        mergeStatic(g);
        this.wheels.push(g);
    }
    animate(speed: number, steer: number, dt: number) {
        this.wheels.forEach(w => w.rotation.x -= speed * dt / .34);
        this.fork.rotation.y = -steer * .4;
    }
}
