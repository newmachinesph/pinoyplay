import * as T from 'three';
import { SceneKit, StreetKid } from '../../core/rendering/scene-kit';
import { mergeStatic } from '../jeepney-rush/jeepney';
import type { PropLibrary } from '../../core/rendering/props';
export class Bangka extends T.Group {
    constructor(kit: SceneKit) {
        super();
        const hull = new T.Shape();
        hull.moveTo(0, -2.2);
        hull.quadraticCurveTo(.65, -1.1, .5, 1.4);
        hull.quadraticCurveTo(.35, 1.85, 0, 2);
        hull.quadraticCurveTo(-.35, 1.85, -.5, 1.4);
        hull.quadraticCurveTo(-.65, -1.1, 0, -2.2);
        const geo = new T.ExtrudeGeometry(hull, { depth: .42, bevelEnabled: true, bevelSize: .1, bevelThickness: .13, bevelSegments: 2, steps: 1, curveSegments: 16 });
        geo.rotateX(Math.PI / 2);
        kit.mesh(this, geo, 0xd95440, [0, .28, 0]);
        const deck = new T.ShapeGeometry(hull, 16);
        deck.rotateX(Math.PI / 2);
        const deckMesh = kit.mesh(this, deck, 0xf1dba2, [0, .3, 0]);
        deckMesh.material.side = T.DoubleSide;
        for (const side of [-1, 1]) {
            kit.pipe(this, 0xffe1a2, [[0, .42, -2.12], [side * .5, .43, -1.2], [side * .47, .43, 1.3], [0, .43, 1.95]], .045);
            kit.pipe(this, 0xe8cc82, [[side * 1.28, .08, -1.9], [side * 1.45, -.01, -1.3], [side * 1.45, -.01, 1.6], [side * 1.3, .05, 2]], .065);
            for (const z of [-1.05, 1.15]) {
                kit.pipe(this, 0xbca169, [[0, .42, z], [side * .7, .5, z], [side * 1.4, .05, z]], .035);
                kit.pipe(this, 0xf0dbaf, [[side * .4, .35, z], [side * .4, 1.45, z]], .027);
            }
        }
        for (const z of [-.7, 0, .7])
            kit.box(this, 0x9e6949, [.87, .08, .22], [0, .43, z], .015);
        kit.box(this, 0x176ab5, [1.1, .07, 2.7], [0, 1.47, .05], .035);
        for (const x of [-.35, 0, .35])
            kit.box(this, 0xf2e8cb, [.025, .018, 2.66], [x, 1.51, .05], .006);
        kit.box(this, 0x263b42, [.35, .5, .27], [0, .4, 1.7], .06);
        kit.cylinder(this, 0xcbdadd, .04, .8, [0, -.07, 1.8]);
        mergeStatic(this);
        this.pilot = new StreetKid(kit, 0xf2bf48);
        this.pilot.scale.setScalar(.52);
        this.pilot.position.set(0, .38, .8);
        this.add(this.pilot);
    }
    private pilot: StreetKid;
    /** Swap the authored hull for the generated bangka, keeping the pilot; same 4.2 m length, bow toward -Z. */
    useModel(props: PropLibrary) {
        if (!props.has('bangka'))
            return;
        const height = 4.4 / props.size('bangka').z;
        this.children.filter(child => child !== this.pilot).forEach(child => child.visible = false);
        props.place(this, 'bangka', height, [0, -.05, 0], Math.PI);
        this.pilot.position.set(0, height * .32, 1.05);
    }
}
