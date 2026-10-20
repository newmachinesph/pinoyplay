import * as T from 'three';
import { ThreeWorld } from '../../core/rendering/three-world';
import { BARANGAY_PROPS, dressBarangay } from '../../core/rendering/barangay';
import { StreetKid } from '../../core/rendering/scene-kit';
import { mergeStatic } from '../jeepney-rush/jeepney';
import { TumbangModel } from './model';
export class TumbangWorld extends ThreeWorld {
    private kid?: StreetKid;
    private guard?: StreetKid;
    private can?: T.Group;
    private slipper?: T.Group;
    private dots: T.Mesh[] = [];
    private marker?: T.Mesh;
    private spectators: StreetKid[] = [];
    private previousTime = 0;
    private wasFallen = false;
    private wasTurn = '';
    private wasElapsed = 0;
    private landing = { x: 0, z: 0 };
    constructor(host: HTMLElement) {
        super(host, 'tumbang');
        this.buildTumbang();
        this.ready = this.props.load(BARANGAY_PROPS).then(() => { dressBarangay(this.props, this.scene, 'court'); });
    }
    private buildTumbang() {
        const k = this.kit;
        k.neighborhood(this.scene, 'court');
        const field = new T.Group();
        this.scene.add(field);
        k.ground(field, 'dirt', [12.5, .04, 16], [0, -.01, 0], 3);
        k.box(field, 0xffefd1, [11.5, .02, .09], [0, .02, 5.4]);
        const safe = k.label(field, 'BAHAY · SAFE ZONE', 5, .55, [0, .03, 7]);
        safe.rotation.x = -Math.PI / 2;
        this.kid = new StreetKid(k, 0x168e91, true);
        this.scene.add(this.kid);
        this.guard = new StreetKid(k, 0xd64d3e);
        this.scene.add(this.guard);
        // Larger players read better on a phone; collisions live in the model, not the mesh.
        this.kid.scale.setScalar(1.3);
        this.guard.scale.setScalar(1.3);
        for (const [x, z, shirt] of [[-6.1, -1.2, 0xe2a33b], [6.1, 2.4, 0x5a9b5e], [-6.1, 3.9, 0x8d5bb5]]) {
            const seat = new T.Group();
            seat.position.set(x, 0, z);
            const fan = new StreetKid(k, shirt, x > 0);
            fan.scale.setScalar(1.15);
            seat.add(fan);
            this.scene.add(seat);
            this.spectators.push(fan);
        }
        this.can = new T.Group();
        this.scene.add(this.can);
        k.cylinder(this.can, 0xb9c7c5, .3, .75, [0, .4, 0]);
        for (const y of [.09, .18, .6, .72])
            k.cylinder(this.can, 0xcbdadd, .315, .035, [0, y, 0]);
        k.cylinder(this.can, 0x506563, .26, .015, [0, .79, 0]);
        mergeStatic(this.can);
        this.slipper = new T.Group();
        this.scene.add(this.slipper);
        k.sphere(this.slipper, 0x1b68be, .3, [0, .05, 0], [.65, .15, 1.5]);
        k.pipe(this.slipper, 0x80c7ef, [[-.18, .09, .1], [0, .17, -.17], [.18, .09, .1]], .035);
        mergeStatic(this.slipper);
        for (let i = 0; i < 20; i++)
            this.dots.push(k.sphere(this.scene, 0xffdc69, .055, [0, 0, 0]));
        this.marker = k.mesh(this.scene, new T.RingGeometry(.6, .66, 40), 0xf5ce66);
        this.marker.rotation.x = -Math.PI / 2;
        mergeStatic(field);
    }
    private updateTumbang(m: TumbangModel, time: number) {
        this.kid!.position.set(m.x, 0, m.z);
        this.kid!.pose(time, m.turn === 'retrieve' && !!(m.input.x || m.input.y), m.turn === 'aim' ? m.aim : m.facing, m.charging ? m.power : 0);
        this.guard!.position.set(m.guard.x, 0, m.guard.z);
        this.guard!.pose(time, m.turn === 'retrieve', m.guard.facing);
        this.spectators.forEach((fan, i) => {
            const facing = fan.parent!.position.x > 0 ? -Math.PI / 2 : Math.PI / 2;
            fan.pose(time + i, false, facing, m.can.fallen ? .45 + Math.abs(Math.sin(time * 9 + i)) * .5 : 0);
            if (m.can.fallen)
                fan.position.y = Math.abs(Math.sin(time * 9 + i * 1.3)) * .25;
        });
        this.can!.position.set(m.can.x, .02, m.can.z);
        this.can!.rotation.z = m.can.fallen ? Math.PI / 2 : 0;
        this.slipper!.visible = !m.slipper.collected;
        this.slipper!.position.set(m.slipper.x, m.slipper.y, m.slipper.z);
        this.slipper!.rotation.y = m.turn === 'flight' ? m.flight * Math.PI * 4 : 0;
        const target = m.target;
        this.dots.forEach((dot, i) => { const t = i / this.dots.length; dot.visible = m.turn === 'aim'; dot.position.set(target.x * t, .2 + Math.sin(t * Math.PI) * 2.8, 6 + (target.z - 6) * t); });
        this.marker!.visible = m.turn === 'aim';
        this.marker!.position.set(target.x, .04, target.z);
    }
    render(model: TumbangModel, time = 0) {
        const dt = Math.min(.04, Math.max(0, time - this.previousTime));
        this.previousTime = time;
        const motionTime = model.phase === 'ready' ? time : model.elapsed;
        this.updateTumbang(model, motionTime);
        if (model.can.fallen && !this.wasFallen) {
            this.bursts.emit('confetti', { x: model.can.x, y: .9, z: model.can.z }, 44);
            this.bursts.emit('dust', { x: model.can.x, y: .15, z: model.can.z }, 14);
        }
        // A miss resets the slipper in the same tick, so use its last in-flight position; skip restarts.
        if (this.wasTurn === 'flight' && model.turn !== 'flight' && model.elapsed >= this.wasElapsed)
            this.bursts.emit('dust', { x: this.landing.x, y: .1, z: this.landing.z }, 10);
        if (model.turn === 'flight')
            this.landing = { x: model.slipper.x, z: model.slipper.z };
        this.wasElapsed = model.elapsed;
        this.wasFallen = model.can.fallen;
        this.wasTurn = model.turn;
        this.bursts.update();
        this.renderer.render(this.scene, this.camera);
    }
}
