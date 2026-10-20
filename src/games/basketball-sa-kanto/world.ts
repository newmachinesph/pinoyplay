import * as T from 'three';
import { ThreeWorld } from '../../core/rendering/three-world';
import { BARANGAY_PROPS, dressBarangay } from '../../core/rendering/barangay';
import { StreetKid } from '../../core/rendering/scene-kit';
import { mergeStatic } from '../jeepney-rush/jeepney';
import { BasketballModel } from './model';
export class BasketballWorld extends ThreeWorld {
    private kid?: StreetKid;
    private hoop?: T.Group;
    private ball?: T.Group;
    private net = new T.Group();
    private ballShadow?: T.Mesh;
    private dots: T.Mesh[] = [];
    private spectators: StreetKid[] = [];
    private previousTime = 0;
    private seenBaskets = 0;
    private seenImpact = -10;
    constructor(host: HTMLElement) {
        super(host, 'basketball');
        this.buildBasketball();
        this.ready = this.props.load(BARANGAY_PROPS).then(() => { dressBarangay(this.props, this.scene, 'court'); });
    }
    private buildBasketball() {
        const k = this.kit;
        k.neighborhood(this.scene, 'court');
        const court = new T.Group();
        this.scene.add(court);
        k.ground(court, 'court', [13, .05, 17], [0, 0, 0], 4);
        k.box(court, 0xc97250, [5.2, .012, 5.7], [0, .035, -3.8]);
        for (const x of [-6.2, 6.2, -2.6, 2.6])
            k.box(court, 0xf9eac7, [.045, .012, Math.abs(x) > 6 ? 16.2 : 5.7], [x, .05, Math.abs(x) > 6 ? 0 : -3.8]);
        for (const z of [-8, 8, -1])
            k.box(court, 0xf9eac7, [z === -1 ? 5.2 : 12.4, .012, .045], [0, .05, z]);
        const circle = k.mesh(court, new T.RingGeometry(2.1, 2.14, 60), 0xf9eac7, [0, .05, -1]);
        circle.rotation.x = -Math.PI / 2;
        const arc = k.mesh(court, new T.RingGeometry(6.5, 6.55, 60, 1, 0, Math.PI), 0xf9eac7, [0, .05, -5.5]);
        arc.rotation.x = -Math.PI / 2;
        arc.rotation.z = Math.PI;
        mergeStatic(court);
        this.hoop = new T.Group();
        this.scene.add(this.hoop);
        k.cylinder(this.hoop, 0x54716f, .11, 4.2, [0, 2.1, -1.1]);
        k.pipe(this.hoop, 0x54716f, [[0, 3.9, -1.1], [0, 3.9, -.55]], .08);
        k.box(this.hoop, 0xf4e7c9, [2.5, 1.6, .12], [0, 3.9, -.62], .025);
        for (const x of [-.43, .43])
            k.box(this.hoop, 0xc84833, [.045, .59, .015], [x, 3.66, -.547]);
        for (const y of [3.37, 3.95])
            k.box(this.hoop, 0xc84833, [.9, .045, .015], [0, y, -.547]);
        const rim = k.mesh(this.hoop, new T.TorusGeometry(.48, .035, 8, 40), 0xe45b25, [0, 3.25, 0]);
        rim.rotation.x = Math.PI / 2;
        this.net.position.y = 3.25;
        this.hoop.add(this.net);
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI / 6;
            k.pipe(this.net, 0xf4ead3, [[Math.cos(a) * .47, -.01, Math.sin(a) * .47], [Math.cos(a + .2) * .29, -.5, Math.sin(a + .2) * .29]], .009);
        }
        for (const y of [2.84, 3, 3.16]) {
            const net = k.mesh(this.net, new T.TorusGeometry(.29 + (y - 2.75) * .36, .008, 4, 24), 0xf4ead3, [0, y - 3.25, 0]);
            net.rotation.x = Math.PI / 2;
        }
        mergeStatic(this.hoop);
        mergeStatic(this.net);
        this.ball = new T.Group();
        this.scene.add(this.ball);
        k.sphere(this.ball, 0xe58b32, .24, [0, 0, 0]);
        for (let i = 0; i < 3; i++) {
            const seam = k.mesh(this.ball, new T.TorusGeometry(.241, .007, 4, 32), 0x633c29);
            seam.rotation.set(i === 0 ? Math.PI / 2 : 0, i === 1 ? Math.PI / 2 : 0, 0);
        }
        mergeStatic(this.ball);
        this.ballShadow = new T.Mesh(new T.CircleGeometry(.3, 24), new T.MeshBasicMaterial({ color: 0x102e36, transparent: true, opacity: .28, depthWrite: false }));
        this.ballShadow.rotation.x = -Math.PI / 2;
        this.scene.add(this.ballShadow);
        this.kid = new StreetKid(k, 0x195dba);
        this.kid.position.set(0, 0, 5.5);
        this.scene.add(this.kid);
        for (const [x, z, shirt] of [[-7.5, 1.5, 0xe2a33b], [7.5, -1, 0xd64d3e], [7.6, 4.4, 0x5a9b5e]]) {
            const seat = new T.Group();
            seat.position.set(x, .1, z);
            const fan = new StreetKid(k, shirt, x < 0);
            seat.add(fan);
            this.scene.add(seat);
            this.spectators.push(fan);
        }
        for (let i = 0; i < 25; i++)
            this.dots.push(k.sphere(this.scene, 0xffe39b, .045, [0, 0, 0]));
    }
    private updateBasketball(m: BasketballModel, time: number) {
        this.hoop!.position.set(m.hoop.x, 0, m.hoop.z);
        this.ball!.position.set(m.ball.x, m.ball.y, m.ball.z);
        this.ball!.rotation.x = m.shooting ? time * 7 : 0;
        this.kid!.position.set(m.player.x, 0, m.player.z);
        this.kid!.pose(time, m.walking, m.shooting ? m.aim : m.facing, m.walking ? 0 : m.shooting ? .85 : .25 + m.power * .5);
        this.ballShadow!.position.set(m.ball.x, .065, m.ball.z);
        this.ballShadow!.scale.setScalar(1 + m.ball.y * .12);
        (this.ballShadow!.material as T.MeshBasicMaterial).opacity = Math.max(.08, .3 - m.ball.y * .025);
        const netTime = time - m.basketAt;
        const cheering = m.basketAt > 0 && netTime < 1.6;
        this.spectators.forEach((fan, i) => {
            fan.pose(time + i, false, fan.parent!.position.x > 0 ? -Math.PI / 2 : Math.PI / 2, cheering ? .45 + Math.abs(Math.sin(time * 9 + i)) * .5 : 0);
            if (cheering)
                fan.position.y = Math.abs(Math.sin(time * 9 + i * 1.3)) * .25;
        });
        this.net.scale.y = 1 + Math.max(0, Math.sin(netTime * 18)) * Math.exp(-netTime * 5) * .35;
        let beforeBoard = true;
        this.dots.forEach((dot, i) => {
            const t = i * .06, vy = 5.5 + m.power * 4;
            dot.position.set(m.releaseX + Math.sin(m.aim) * m.shotSpeed * t, 2 + vy * t - 4.9 * t * t, m.releaseZ - Math.cos(m.aim) * m.shotSpeed * t);
            if (dot.position.z < m.hoop.z - .32 && Math.abs(dot.position.x - m.hoop.x) < 1.5 && dot.position.y > 2.85 && dot.position.y < 4.95) beforeBoard = false;
            dot.visible = !m.shooting && !m.walking && beforeBoard && dot.position.y > .24;
        });
    }
    render(model: BasketballModel, time = 0) {
        const dt = Math.min(.04, Math.max(0, time - this.previousTime));
        this.previousTime = time;
        const motionTime = model.phase === 'ready' ? time : model.elapsed;
        this.updateBasketball(model, motionTime);
        if (model.baskets > this.seenBaskets)
            this.bursts.emit('confetti', { x: model.hoop.x, y: 3.3, z: model.hoop.z }, 50);
        if (model.impactAt !== this.seenImpact && model.lastImpact === 'floor')
            this.bursts.emit('dust', { x: model.ball.x, y: .1, z: model.ball.z }, 8);
        this.seenBaskets = model.baskets;
        this.seenImpact = model.impactAt;
        this.bursts.update();
        this.renderer.render(this.scene, this.camera);
    }
}
