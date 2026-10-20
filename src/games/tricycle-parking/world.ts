import * as T from 'three';
import { ThreeWorld } from '../../core/rendering/three-world';
import { BARANGAY_PROPS, dressBarangay } from '../../core/rendering/barangay';
import { mergeStatic } from '../jeepney-rush/jeepney';
import { ParkingModel } from './model';
import { Tricycle } from './vehicle';
import { TrafficVehicle } from '../jeepney-rush/traffic';
export class ParkingWorld extends ThreeWorld {
    private vehicle?: Tricycle;
    private parkingBay?: T.Group;
    private parkedCars: TrafficVehicle[] = [];
    private lastStage = 0;
    private previousTime = 0;
    private seenParks = 0;
    private lastSpot = { x: 0, z: 0 };
    constructor(host: HTMLElement) {
        super(host, 'parking');
        this.buildParking();
        this.ready = this.props.load(BARANGAY_PROPS).then(() => { dressBarangay(this.props, this.scene, 'parking'); });
    }
    private buildParking() {
        const k = this.kit;
        k.neighborhood(this.scene, 'parking');
        const ground = new T.Group();
        this.scene.add(ground);
        k.ground(ground, 'asphalt', [12.8, .07, 18.5], [0, -.04, 0], 3);
        for (let i = 0; i < 14; i++)
            k.box(ground, 0xacb2a9, [12.6, .012, .025], [0, .005, -9 + i * 1.4]);
        for (const x of [-6.25, 6.25])
            k.box(ground, 0xf4d771, [.08, .012, 18], [x, .01, 0]);
        mergeStatic(ground);
        this.vehicle = new Tricycle(k);
        this.vehicle.scale.setScalar(.9);
        this.scene.add(this.vehicle);
        this.parkingBay = new T.Group();
        this.scene.add(this.parkingBay);
        for (let i = 0; i < 3; i++) {
            const car = new TrafficVehicle(i === 0 ? 'van' : 'sedan', i === 0 ? 0xc8d9c7 : 0xd47b50);
            this.scene.add(car);
            this.parkedCars.push(car);
        }
    }
    private updateParking(m: ParkingModel, dt: number) {
        this.vehicle!.position.set(m.x, 0, m.z);
        this.vehicle!.rotation.y = -m.heading;
        (this.vehicle as Tricycle).animate(m.speed, m.input.x, dt);
        const layoutKey = m.stage * 3 + m.mode;
        if (this.lastStage !== layoutKey) {
            this.lastStage = layoutKey;
            this.disposeTree(this.parkingBay!);
            this.parkingBay!.clear();
            const b = m.bay, color = 0xffd75d;
            for (const side of [-1, 1]) {
                this.kit.box(this.parkingBay!, color, [.09, .015, b.length], [b.x + side * b.width / 2, .02, b.z]);
                this.kit.box(this.parkingBay!, color, [b.width, .015, .09], [b.x, .02, b.z + side * b.length / 2]);
            }
            const sign = this.kit.label(this.parkingBay!, 'PARK HERE', b.width - .3, .6, [b.x, .024, b.z], '#f6cf58');
            sign.rotation.x = -Math.PI / 2;
            this.parkedCars.forEach((car, i) => {
                const o = m.obstacles[i];
                car.visible = !!o;
                if (o) {
                    car.position.set(o.x, 0, o.z);
                    car.scale.set(o.width / 1.9, .9, o.length / (i === 0 ? 4.1 : 3.52));
                }
            });
        }
    }
    render(model: ParkingModel, time = 0) {
        if (model.phase === 'ready') {
            this.camera.position.set(4, 9, 14);
            this.camera.lookAt(0, 1, 6);
            this.camera.zoom = 2.2;
        }
        else {
            this.camera.position.set(2, 25, 23);
            this.camera.lookAt(0, 0, -1);
            this.camera.zoom = 1;
        }
        this.camera.updateProjectionMatrix();
        const dt = Math.min(.04, Math.max(0, time - this.previousTime));
        this.previousTime = time;
        this.updateParking(model, model.phase === "running" ? dt : 0);
        // The model moves on to the next bay in the same tick, so celebrate where the tricycle stopped.
        if (model.parked > this.seenParks)
            this.bursts.emit('confetti', { x: this.lastSpot.x, y: 1.6, z: this.lastSpot.z }, 48);
        this.seenParks = model.parked;
        this.lastSpot = { x: model.x, z: model.z };
        this.bursts.update();
        this.renderer.render(this.scene, this.camera);
    }
}
