import * as T from 'three';
import { ThreeWorld } from '../../core/rendering/three-world';
import { mergeStatic } from '../jeepney-rush/jeepney';
import { BoatModel } from './model';
import { Bangka } from './vehicle';
import { HullBuoyancy, sampleWater } from './water';
import type { PropName } from '../../core/rendering/props';
/** Generated islands cycled along the course: height and distance from the course centre. */
const ISLANDS: [PropName, number, number][] = [
    ['karst-islet', 9, 14], ['palm-islet', 2.4, 10], ['sea-stacks', 5.5, 12.5], ['nipa-hut-stilts', 3.6, 9.5], ['karst-islet', 7, 13], ['palm-islet', 2.8, 10.5],
];
const SEA_PROPS: PropName[] = ['karst-islet', 'palm-islet', 'sea-stacks', 'nipa-hut-stilts', 'bangka'];
export class BoatWorld extends ThreeWorld {
    private vehicle?: Bangka;
    private objects = new Map<string, T.Group>();
    private islands: T.Group[] = [];
    private water?: T.Mesh<T.PlaneGeometry>;
    private buoyancy = new HullBuoyancy();
    private wake!: T.InstancedMesh;
    private wakeAlpha!: T.InstancedBufferAttribute;
    private wakeParticles = Array.from({ length: 96 }, () => ({ x: 0, z: 0, age: 10, side: 1 }));
    private wakeCursor = 0;
    private wakeDistance = 0;
    private matrix = new T.Object3D();
    private previousTime = 0;
    private previousDistance = 0;
    private seenGates = 0;
    private waterTexture?: T.CanvasTexture;
    constructor(host: HTMLElement) {
        super(host, 'sea');
        this.buildSea();
        this.ready = this.props.load(SEA_PROPS).then(() => {
            this.islands.forEach((island, i) => {
                const [name, height, offset] = ISLANDS[i % ISLANDS.length];
                if (!this.props.has(name))
                    return;
                this.disposeTree(island);
                island.clear();
                island.position.x = Math.sign(island.position.x) * offset;
                // Sink the base slightly so wave troughs never show its underside.
                this.props.place(island, name, height, [0, -.35, 0], i * 1.7);
            });
            // Distant karst skyline; fog turns it into soft silhouettes on the horizon.
            for (const [x, h] of [[-34, 20], [4, 26], [38, 22]])
                this.props.place(this.scene, 'karst-islet', h, [x, -.5, -112], x * .05)?.traverse(o => o.castShadow = false);
            this.vehicle!.useModel(this.props);
        });
    }
    private buildSea() {
        const k = this.kit;
        const geometry = new T.PlaneGeometry(160, 200, 80, 100);
        geometry.rotateX(-Math.PI / 2);
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#299eb4';
        ctx.fillRect(0, 0, 512, 512);
        for (let row = -2; row < 22; row++) {
            ctx.strokeStyle = row % 3 ? '#84d6d24a' : '#b8f1df55';
            ctx.lineWidth = row % 3 ? 1.4 : 2.1;
            ctx.beginPath();
            for (let x = 0; x <= 512; x += 4) {
                const y = row * 28 + Math.sin(x * .022 + row * .9) * 10 + Math.cos(x * .044 - row) * 4;
                if (x === 0)
                    ctx.moveTo(x, y);
                else
                    ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        for (let i = 0; i < 160; i++) {
            const x = (i * 137) % 512, y = (i * 71) % 512;
            ctx.fillStyle = i % 3 ? '#e3fff21a' : '#dcfff542';
            ctx.fillRect(x, y, 3 + i % 9, 1);
        }
        this.waterTexture = new T.CanvasTexture(canvas);
        this.waterTexture.colorSpace = T.SRGBColorSpace;
        this.waterTexture.wrapS = this.waterTexture.wrapT = T.RepeatWrapping;
        this.waterTexture.repeat.set(10, 13);
        this.water = new T.Mesh(geometry, new T.MeshStandardMaterial({ color: 0xffffff, map: this.waterTexture, roughness: .22, metalness: .24 }));
        this.water.position.set(0, 0, -50);
        this.water.receiveShadow = true;
        this.scene.add(this.water);
        for (let i = 0; i < 12; i++) {
            const island = new T.Group();
            const side = i % 2 ? -1 : 1;
            island.position.set(side * (13 + (i % 3) * 4), 0, 15 - Math.floor(i / 2) * 22);
            k.sphere(island, 0xe3ce96, 1, [0, -.1, 0], [5, .7, 7]);
            for (let n = 0; n < 4; n++) {
                const rock = k.mesh(island, new T.DodecahedronGeometry(1, 0), n % 2 ? 0x637d62 : 0x7a8f72, [Math.sin(n * 2) * 2, 2 + n % 2, Math.cos(n) * 3]);
                rock.scale.set(2.5, 3 + n % 2 * 2, 2.6);
                k.sphere(island, 0x3b8058, 1, [Math.sin(n * 2) * 2, 4 + n % 2 * 2, Math.cos(n) * 3], [2.4, 1.7, 2.5]);
            }
            k.palm(island, side * -3, 3, 4);
            mergeStatic(island);
            this.islands.push(island);
            this.scene.add(island);
        }
        this.vehicle = new Bangka(k);
        this.vehicle.scale.setScalar(.78);
        this.scene.add(this.vehicle);
        const foamCanvas = document.createElement('canvas');
        foamCanvas.width = foamCanvas.height = 64;
        const foamContext = foamCanvas.getContext('2d')!;
        const foam = foamContext.createRadialGradient(32, 32, 2, 32, 32, 30);
        foam.addColorStop(0, '#f5fffaee'); foam.addColorStop(.35, '#d6fff5aa'); foam.addColorStop(1, '#d6fff500');
        foamContext.fillStyle = foam; foamContext.fillRect(0, 0, 64, 64);
        const foamMap = new T.CanvasTexture(foamCanvas);
        const wakeMaterial = new T.MeshBasicMaterial({ map: foamMap, transparent: true, depthWrite: false, color: 0xebfff9, side: T.DoubleSide });
        wakeMaterial.onBeforeCompile = shader => {
            shader.vertexShader = 'attribute float wakeAlpha; varying float vWakeAlpha;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWakeAlpha = wakeAlpha;');
            shader.fragmentShader = 'varying float vWakeAlpha;\n' + shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= vWakeAlpha;');
        };
        wakeMaterial.customProgramCacheKey = () => 'bangka-foam-v1';
        const wakeGeometry = new T.PlaneGeometry(1, 1);
        wakeGeometry.rotateX(-Math.PI / 2);
        this.wakeAlpha = new T.InstancedBufferAttribute(new Float32Array(96), 1).setUsage(T.DynamicDrawUsage);
        wakeGeometry.setAttribute('wakeAlpha', this.wakeAlpha);
        this.wake = new T.InstancedMesh(wakeGeometry, wakeMaterial, 96);
        this.wake.instanceMatrix.setUsage(T.DynamicDrawUsage);
        this.wake.frustumCulled = false;
        this.scene.add(this.wake);
    }
    private updateSea(m: BoatModel, dt: number, time: number) {
        if (m.distance < this.previousDistance) {
            for (const object of this.objects.values()) {
                this.disposeTree(object);
                object.removeFromParent();
            }
            this.objects.clear();
            this.buoyancy.reset();
            this.wakeParticles.forEach(p => p.age = 10);
            this.wakeDistance = 0;
        }
        const travel = Math.max(0, m.distance - this.previousDistance);
        this.previousDistance = m.distance;
        this.waterTexture!.offset.y = m.distance / 200;
        this.waterTexture!.offset.x = Math.sin(time * .13) * .012;
        const fluidDt = m.phase === 'paused' || m.phase === 'over' ? 0 : dt;
        this.buoyancy.update(m.x, 4 - m.distance, time, fluidDt, m.roll, m.heading);
        this.vehicle!.position.set(m.x, this.buoyancy.height, 4);
        this.vehicle!.rotation.set(this.buoyancy.pitch, m.heading, this.buoyancy.roll);
        const positions = this.water!.geometry.attributes.position;
        const normals = this.water!.geometry.attributes.normal;
        for (let i = 0; i < positions.count; i++) {
            const wave = sampleWater(positions.getX(i), positions.getZ(i) - 50 - m.distance, time);
            positions.setY(i, wave.height);
            const length = Math.hypot(wave.slopeX, 1, wave.slopeZ);
            normals.setXYZ(i, -wave.slopeX / length, 1 / length, -wave.slopeZ / length);
        }
        positions.needsUpdate = true;
        normals.needsUpdate = true;
        if (m.phase === 'running')
            for (const island of this.islands) {
                island.position.z += m.speed * dt;
                if (island.position.z > 34)
                    island.position.z -= 132;
            }
        this.wakeDistance += travel;
        while (this.wakeDistance > .6) {
            this.wakeDistance -= .6;
            for (const side of [-1, 1]) {
                const p = this.wakeParticles[this.wakeCursor++ % this.wakeParticles.length];
                p.x = m.x + side * .52 + Math.sin(m.heading) * 1.25;
                p.z = 5.35 - m.distance; p.age = 0; p.side = side;
            }
        }
        this.wakeParticles.forEach((p, i) => {
            p.age += fluidDt;
            const life = Math.max(0, 1 - p.age / 1.8);
            const x = p.x + p.side * p.age * .65, z = p.z + m.distance;
            this.matrix.position.set(x, sampleWater(x, p.z, time).height + .025, z);
            this.matrix.rotation.set(0, -p.side * .25, 0);
            this.matrix.scale.set(.3 + p.age * .9, 1, .7 + p.age * .6);
            this.matrix.updateMatrix(); this.wake.setMatrixAt(i, this.matrix.matrix);
            this.wakeAlpha.setX(i, life * life * .8);
        });
        this.wake.instanceMatrix.needsUpdate = true;
        this.wakeAlpha.needsUpdate = true;
        const live = new Set<string>();
        for (const gate of m.gates) {
            const id = `g${gate.id}`;
            live.add(id);
            let group = this.objects.get(id);
            if (!group) {
                group = new T.Group();
                this.objects.set(id, group);
                this.scene.add(group);
                for (const side of [-1, 1]) {
                    const x = side * gate.width / 2;
                    this.kit.cylinder(group, side < 0 ? 0xe95341 : 0x35b575, .32, .7, [x, .13, 0]);
                    this.kit.cylinder(group, 0xffe6b0, .23, .12, [x, .52, 0]);
                    this.kit.cylinder(group, 0xe4dec2, .035, 1.3, [x, 1.1, 0]);
                    this.kit.sphere(group, side < 0 ? 0xe95341 : 0x35b575, .19, [x, 1.5, 0]);
                }
                for (let i = -3; i <= 3; i++)
                    this.kit.box(group, 0xa4ebcb, [.35, .012, .1], [i * gate.width / 8, -.12, 0]);
                mergeStatic(group);
            }
            const surface = sampleWater(gate.x, gate.z - m.distance, time);
            group.position.set(gate.x, surface.height + .05, gate.z);
            group.rotation.set(-Math.atan(surface.slopeZ), 0, Math.atan(surface.slopeX));
        }
        for (const rock of m.rocks) {
            const id = `r${rock.id}`;
            live.add(id);
            let group = this.objects.get(id);
            if (!group) {
                group = new T.Group();
                // Footprint matches the collision radius: sea-stack width is about 1.54 x its height.
                if (!this.props.place(group, 'sea-stacks', rock.radius * 2.2 / 1.54, [0, -.15, 0], rock.id))
                    this.kit.mesh(group, new T.DodecahedronGeometry(rock.radius, 1), 0x778c7b, [0, .2, 0]);
                this.objects.set(id, group);
                this.scene.add(group);
            }
            group.position.set(rock.x, 0, rock.z);
        }
        for (const [id, object] of this.objects)
            if (!live.has(id)) {
                this.disposeTree(object);
                object.removeFromParent();
                this.objects.delete(id);
            }
    }
    render(model: BoatModel, time = 0) {
        const dt = Math.min(.04, Math.max(0, time - this.previousTime));
        this.previousTime = time;
        const motionTime = model.phase === 'ready' ? time : model.elapsed;
        this.updateSea(model, dt, motionTime);
        if (model.passed > this.seenGates)
            this.bursts.emit('splash', { x: model.x, y: .4, z: 3 }, 30);
        this.seenGates = model.passed;
        this.bursts.update();
        // Follow the boat across the full course; portrait framing must never lose it.
        this.camera.position.x = model.x;
        this.camera.lookAt(model.x * .9, 0, -4);
        this.renderer.render(this.scene, this.camera);
    }
}
