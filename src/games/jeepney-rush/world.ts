import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { TrafficVehicle } from './traffic';
import { PedestrianCrossing } from './crossing';
import { Jeepney } from './jeepney';
import { LANE_WIDTH, PLAYER_Z, type RushModel } from './model';
import { PropLibrary, type PropName } from '../../core/rendering/props';
import { Bursts } from '../../core/rendering/bursts';
import { surfaceTexture } from '../../core/rendering/scene-kit';

/** Generated roadside buildings per district (Cubao, Palengke, Quiapo, Binondo, Baywalk) with height in metres. */
const DISTRICT_SHOPS: [PropName, number][][] = [
  [['sari-sari-store', 5], ['panaderia', 5], ['two-storey-house', 7.4]],
  [['fruit-stall', 3.9], ['karinderya', 4.8], ['sari-sari-store', 5]],
  [['botika', 5], ['apartment', 9.5], ['vulcanizing', 4.4]],
  [['apartment', 9.5], ['two-storey-house', 7.4], ['panaderia', 5]],
  [['karinderya', 4.8], ['fruit-stall', 3.9], ['sari-sari-store', 5]],
];
const STREET_PROPS: [PropName, number][] = [
  ['coconut-palm', 6.5], ['bougainvillea-planter', 1.3], ['fishball-cart', 2.5], ['mango-tree', 5.5], ['waiting-shed', 3.1], ['water-drums', 1.3],
];
const ROADSIDE_PROPS = [...new Set([...DISTRICT_SHOPS.flat(), ...STREET_PROPS].map(([name]) => name))];
const palette = { teal: 0x0c7a75, yellow: 0xf9bf35, coral: 0xe65f45, chrome: 0xc9d9d8, glass: 0x174c59, tire: 0x26363b };
const materials = new Map<number, THREE.MeshStandardMaterial>();
function material(color: number) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshStandardMaterial({
    color, roughness: color === palette.chrome ? 0.28 : 0.84,
    metalness: color === palette.chrome ? 0.65 : 0.02,
  }));
  return materials.get(color)!;
}
const box = new THREE.BoxGeometry(1, 1, 1);
function block(parent: THREE.Object3D, color: number, size: number[], at: number[]) {
  const m = new THREE.Mesh(box, material(color));
  m.scale.set(size[0], size[1], size[2]); m.position.set(at[0], at[1], at[2]);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cylinder(parent: THREE.Object3D, color: number, radius: number, depth: number, at: number[], rotate = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 12), material(color));
  m.position.set(at[0], at[1], at[2]); if (rotate) m.rotation.z = Math.PI / 2;
  m.castShadow = true; parent.add(m); return m;
}
function sign(text: string, bg: string, fg: string, width: number, height: number) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = fg; ctx.lineWidth = 5; ctx.strokeRect(10, 10, 492, 108);
  ctx.fillStyle = fg; ctx.font = 'bold 55px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 67, 470);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
}

function palm(parent: THREE.Object3D, x: number, z: number, height: number) {
  cylinder(parent, 0x907950, 0.16, height, [x, height / 2, z]);
  for (let j = 0; j < 7; j++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.52, 2.8, 4), material(j % 2 ? 0x37826c : 0x539778));
    leaf.position.set(x + Math.sin(j) * 0.9, height, z + Math.cos(j) * 0.9);
    leaf.rotation.set(Math.cos(j) * 1.1, j, Math.sin(j) * 1.1); parent.add(leaf);
  }
}

function batchMeshes(group: THREE.Group) {
  const bins = new Map<THREE.Material, THREE.BufferGeometry[]>();
  group.updateMatrixWorld(true);
  const remove: THREE.Mesh[] = [];
  group.traverse(o => {
    if (!(o instanceof THREE.Mesh) || !(o.material instanceof THREE.MeshStandardMaterial) || o.parent?.userData.bunting) return;
    const geometry = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(
      new THREE.Matrix4().copy(group.matrixWorld).invert().multiply(o.matrixWorld),
    );
    const list = bins.get(o.material) ?? []; list.push(geometry); bins.set(o.material, list); remove.push(o);
  });
  remove.forEach(o => { o.removeFromParent(); if (o.geometry !== box) o.geometry.dispose(); });
  for (const [mat, geometries] of bins) {
    const merged = mergeGeometries(geometries, false);
    if (merged) { const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); }
    geometries.forEach(g => g.dispose());
  }
}

export class RushWorld {
  ready: Promise<void>;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(53, 1, 0.1, 150);
  jeep = new Jeepney();
  private sections: THREE.Group[] = [];
  private objects = new Map<number, THREE.Object3D>();
  private carPool = new Map<string, TrafficVehicle[]>();
  private crossing = new PedestrianCrossing();
  private coinPool: THREE.Object3D[] = [];
  private resizeObserver: ResizeObserver;
  private previousDistance = 0;
  private sun = new THREE.DirectionalLight(0xffe4ad, 2.4);
  private skyColor = new THREE.Color();
  private sunColor = new THREE.Color();
  private disposed = false;
  private environmentTarget: THREE.WebGLRenderTarget;
  private props = new PropLibrary();
  private propsReady = false;
  private bursts = new Bursts();
  private seenFares = 0;
  private seenLives = 3;
  private shake = 0;
  private lastTime = 0;
  private asphalt = surfaceTexture('asphalt', [10.3 / 4, 180 / 4]);
  private facadeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, transparent: true, opacity: 0 });
  constructor(private host: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.domElement.setAttribute('aria-label', 'Manila streets and your jeepney');
    host.append(this.renderer.domElement);
    this.scene.background = new THREE.Color(0xa5d4cd);
    this.scene.fog = new THREE.Fog(0xa5d4cd, 38, 115);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environmentTarget = pmrem.fromScene(environment, 0.04);
    this.scene.environment = this.environmentTarget.texture;
    this.scene.environmentIntensity = 0.45;
    environment.dispose(); pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xe8ffff, 0x867963, 1.5));
    const sun = this.sun;
    sun.position.set(-12, 25, 10); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024); sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 25; sun.shadow.camera.bottom = -25; sun.shadow.normalBias = 0.06;
    this.scene.add(sun);
    const road = new THREE.Mesh(new THREE.BoxGeometry(10.3, 0.1, 180), new THREE.MeshStandardMaterial({ map: this.asphalt, roughness: .95 }));
    road.position.set(0, -0.12, -50); road.receiveShadow = true; this.scene.add(road);
    block(this.scene, 0x9baa83, [150, 0.12, 180], [0, -0.24, -50]);
    for (let i = 0; i < 7; i++) {
      const segment = this.makeSection(i); segment.position.z = 16 - i * 20;
      this.scene.add(segment); this.sections.push(segment);
    }
    this.scene.add(this.jeep, this.crossing, this.bursts);
    this.ready = Promise.all([this.loadFacades(), this.props.load(ROADSIDE_PROPS)]).then(() => {
      // Rebuild the opening sections with generated buildings, but only when every model arrived;
      // otherwise the authored block buildings stay.
      if (this.disposed || !ROADSIDE_PROPS.every(name => this.props.has(name))) return;
      this.propsReady = true;
      this.sections = this.sections.map((old, i) => {
        const section = this.makeSection(i, old.userData.district);
        section.position.z = old.position.z;
        this.removeSection(old); this.scene.add(section);
        return section;
      });
    });
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host); this.resize();
  }
  private async loadFacades() {
    try {
      const texture = await new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}art/manila-facades.webp`);
      if (this.disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(4, this.renderer.capabilities.getMaxAnisotropy());
      this.facadeMaterial.map = texture;
      this.facadeMaterial.transparent = false; this.facadeMaterial.opacity = 1;
      this.facadeMaterial.needsUpdate = true;
    } catch (error) { console.warn('Storefront textures unavailable; using built-in facades.', error); }
  }
  private makeSection(index: number, district = 0) {
    const section = new THREE.Group();
    section.userData.district = district;
    for (const x of [-1.35, 1.35]) for (let z = 0; z < 20; z += 5)
      block(section, 0xf6e9bc, [0.09, 0.025, 2.5], [x, 0, -z]);
    for (const side of [-1, 1]) {
      block(section, 0xd5c8af, [1.6, 0.25, 20], [side * 5.8, 0.03, -10]);
      for (let k = 0; k < 10; k++) block(section, k % 2 ? 0xebd5ad : 0x596f69, [0.25, 0.25, 2], [side * 5.05, 0.08, -1 - k * 2]);
      if (district === 4 && side === -1) {
        block(section, 0x398f9f, [45, .06, 20], [-29, -.03, -10]);
        for (let n = 0; n < 5; n++) {
          block(section, 0xb6e0d8, [14, .02, .1], [-18 - n * 2, .02, -n * 4]);
          block(section, 0xe3d9bf, [.22, 1.1, .22], [-6.55, .6, -n * 4]);
        }
        block(section, 0xe3d9bf, [.16, .15, 20], [-6.55, 1.1, -10]);
        palm(section, -6, -5, 6); palm(section, -6, -16, 7);
        continue;
      }
      for (let j = 0; j < 2 && !this.propsReady; j++) {
        const x = side * (8.5 + (index % 2) * 0.4), z = -4 - j * 10;
        const tile = (index + j) % 3;
        const height = district === 1 ? 3.2 + tile * .25 : district === 3 ? 7 + tile : 5 + tile * 0.65;
        const colors = [
          [0xc8a363, 0x64938c, 0xb87b61],
          [0xe3b26c, 0x82a777, 0xc99275],
          [0xd8c8a3, 0xb7af8c, 0xd1b996],
          [0xa84736, 0xcfbd94, 0x92775c],
          [0xe6c68d, 0x76aa9b, 0xe0a27a],
        ][district];
        block(section, colors[tile], [5, height, 8], [x, height / 2, z]);
        block(section, index % 2 ? 0xa75742 : 0x597e7b, [5.6, 0.22, 8.6], [x, height + 0.1, z]);
        for (let n = 0; n < 8; n++) block(section, 0x7c8b7e, [5.7, 0.07, 0.09], [x, height + 0.24, z - 3.6 + n]);
        for (let n = 0; n < 3; n++) {
          block(section, palette.glass, [0.03, 0.85, 1.4], [x - side * 2.51, height - 1.1, z - 2.3 + n * 2.3]);
          block(section, 0xe8d8b1, [0.12, 0.1, 1.6], [x - side * 2.55, height - 1.55, z - 2.3 + n * 2.3]);
        }
        block(section, 0x476461, [0.03, 1.8, 2.0], [x - side * 2.52, 0.9, z]);
        const facadeGeometry = new THREE.PlaneGeometry(7.98, height);
        const uv = facadeGeometry.attributes.uv;
        for (let n = 0; n < uv.count; n++) uv.setX(n, (tile + 0.004 + uv.getX(n) * 0.992) / 3);
        const facade = new THREE.Mesh(facadeGeometry, this.facadeMaterial);
        facade.rotation.y = -side * Math.PI / 2;
        facade.position.set(x - side * 2.54, height / 2, z); section.add(facade);
        for (let n = 0; n < 6; n++) {
          const awning = block(section, n % 2 ? 0xf2d8ad : 0xc96448, [1.5, 0.1, 0.56], [x - side * 2.9, 2.3, z - 1.5 + n * 0.56]);
          awning.rotation.z = side * 0.2;
        }
        const names = [
          ['SARI-SARI', 'KAINAN', 'PANADERIA'],
          ['PRUTAS', 'GULAY', 'PALENGKE'],
          ['BOTIKA', 'MERIENDA', 'SAMPAGUITA'],
          ['PANCITERIA', 'HOPIA', 'TEAHOUSE'],
          ['BUKO JUICE', 'KAPE', 'BAYWALK'],
        ][district];
        const shopSign = sign(names[tile], index % 2 ? '#e8be54' : '#176e68', index % 2 ? '#27564e' : '#fff0c6', 3.3, 0.65);
        shopSign.position.set(x - side * 2.56, 2.9, z); shopSign.rotation.y = -side * Math.PI / 2; section.add(shopSign);
        cylinder(section, 0xa56446, 0.35, 0.6, [side * 6.05, 0.35, z + 3]);
        const shrub = new THREE.Mesh(new THREE.IcosahedronGeometry(0.65, 0), material(0x4b8d68));
        shrub.position.set(side * 6.05, 1.1, z + 3); section.add(shrub);
        if (district === 1) {
          block(section, 0x806047, [1.2, .8, 3.2], [side * 6, .55, z]);
          for (let n = 0; n < 9; n++) {
            const fruit = new THREE.Mesh(new THREE.IcosahedronGeometry(.19, 1), material(n % 2 ? 0xf4c33d : 0x6e9d43));
            fruit.position.set(side * (5.8 + n % 2 * .4), 1.1, z - 1.2 + n * .3); section.add(fruit);
          }
        }
        if (district === 3) {
          for (let n = 0; n < 3; n++) {
            const lantern = new THREE.Mesh(new THREE.SphereGeometry(.32, 12, 8), material(0xd63825));
            lantern.scale.y = 1.3; lantern.position.set(side * 5.7, 3.8, z - 2 + n * 2); section.add(lantern);
            cylinder(section, 0xf4ca54, .06, .45, [side * 5.7, 3.25, z - 2 + n * 2]);
          }
        }
      }
      if (district === 2 && side === 1 && index % 2 === 0 && !this.propsReady) {
        block(section, 0xdac7a1, [4, 9, 5], [11, 4.5, -9]);
        block(section, 0xf1dfb9, [4.6, .35, 5.5], [11, 7.6, -9]);
        block(section, 0x66533c, [.05, 1.8, 1.4], [8.96, 7.8, -9]);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.5, 4), material(0x9d6247));
        roof.position.set(11, 10, -9); roof.rotation.y = Math.PI / 4; section.add(roof);
        block(section, 0xc8a652, [.15, 1.5, .15], [11, 11.8, -9]);
        block(section, 0xc8a652, [.9, .15, .15], [11, 12.05, -9]);
      }
      if (index > 0 && index % 2 === 0 && !this.propsReady) palm(section, side * 6.3, -8, 6.4);
      cylinder(section, 0x786a58, 0.1, 7, [side * 6.2, 3.5, -18]);
      block(section, 0x786a58, [1.7, 0.1, 0.1], [side * 6.2, 6.5, -18]);
      block(section, 0x354f4a, [0.035, 0.035, 20], [side * 6.2, 6.7, -8]);
    }
    if (district === 3 && index % 3 === 0) {
      const bunting = new THREE.Group(); bunting.name = 'bunting';
      const line = block(bunting, 0x53675e, [13, 0.03, 0.03], [0, 6.6, -9]);
      line.rotation.z = 0.03;
      for (let i = 0; i < 9; i++) {
        const lantern = new THREE.Mesh(new THREE.SphereGeometry(.25, 10, 8), material(0xd63825));
        lantern.position.set(-6 + i * 1.5, 6.18, -9); bunting.add(lantern);
      }
      batchMeshes(bunting); bunting.userData.bunting = true; section.add(bunting);
    }
    batchMeshes(section);
    if (this.propsReady) this.dressSection(section, index, district);
    return section;
  }
  private dressSection(section: THREE.Group, index: number, district: number) {
    for (const side of [-1, 1]) {
      if (district === 4 && side === -1) continue;
      const facing = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      for (let j = 0; j < 2; j++) {
        const [name, height] = DISTRICT_SHOPS[district][(index + j + (side > 0 ? 1 : 0)) % 3];
        const depth = this.props.size(name).z * height;
        this.props.place(section, name, height, [side * (6.95 + depth / 2), 0, -4 - j * 10], facing);
      }
      const [name, height] = STREET_PROPS[(index * 2 + (side > 0 ? 3 : 0)) % STREET_PROPS.length];
      this.props.place(section, name, height, [side * 6.1, .15, -9], facing);
    }
  }
  private removeSection(section: THREE.Group) {
    section.removeFromParent();
    section.traverse(o => {
      if (!(o instanceof THREE.Mesh) || o.userData.sharedProp) return;
      if (o.geometry !== box) o.geometry.dispose();
      if (o.material instanceof THREE.MeshBasicMaterial) { o.material.map?.dispose(); o.material.dispose(); }
    });
  }
  resize() {
    if (this.disposed) return;
    const { width, height } = this.host.getBoundingClientRect();
    this.renderer.setSize(width, height);
    this.camera.aspect = width / Math.max(1, height); this.camera.updateProjectionMatrix();
  }
  render(model: RushModel, time: number) {
    const ready = model.phase === 'ready';
    const compact = this.host.clientHeight < 680;
    const fov = ready ? compact ? 60 : 53 : 58;
    if (this.camera.fov !== fov) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    this.camera.position.set(ready ? 4.5 : 0, ready ? 7.2 : 11, ready ? 13 : 22);
    this.camera.lookAt(0, ready ? compact ? 0.3 : 1 : 0, ready ? 0 : -15);
    // Wall-clock step: the game clock stops at game over, but the shake must still settle.
    const now = performance.now() / 1000, dt = Math.min(.04, Math.max(0, now - this.lastTime)); this.lastTime = now;
    // One texture repeat spans 4 m; scroll with distance so the asphalt moves with the lane marks.
    this.asphalt.offset.y = model.distance / 4;
    if (model.fares > this.seenFares) this.bursts.emit('sparkle', { x: model.x, y: 2.2, z: PLAYER_Z - 1 }, 14);
    if (model.lives < this.seenLives) { this.bursts.emit('dust', { x: model.x, y: .6, z: PLAYER_Z - 2.2 }, 18); this.shake = .35; }
    this.seenFares = model.fares; this.seenLives = model.lives;
    // A short decaying shake sells a collision without moving the gameplay camera for long.
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt);
      this.camera.position.x += Math.sin(time * 70) * this.shake * .5;
      this.camera.position.y += Math.cos(time * 53) * this.shake * .3;
    }
    this.bursts.update();
    this.jeep.position.set(model.x, 0, ready ? 0.6 : PLAYER_Z);
    this.jeep.rotation.y = ready ? Math.PI + 0.08 : (model.x - (model.lane - 1) * LANE_WIDTH) * 0.11;
    this.jeep.animate(model.distance, time, model.speed, model.x - (model.lane - 1) * LANE_WIDTH, model.phase === 'running' || model.phase === 'paused', model.invincible > 0);
    const restarted = model.distance < this.previousDistance;
    const travel = model.distance >= this.previousDistance ? model.distance - this.previousDistance : 0;
    this.previousDistance = model.distance;
    this.skyColor.set([0xa5d4cd, 0xd6d2ad, 0xc1d6db, 0xe7c1a1, 0xf2ba8c][model.district]);
    (this.scene.background as THREE.Color).lerp(this.skyColor, ready || restarted ? 1 : Math.min(.05, travel * .008));
    (this.scene.fog as THREE.Fog).color.copy(this.scene.background as THREE.Color);
    this.sunColor.set(model.district === 4 ? 0xffbc77 : 0xffe4ad);
    this.sun.color.lerp(this.sunColor, ready || restarted ? 1 : Math.min(.05, travel * .008));
    for (let i = 0; i < this.sections.length; i++) {
      let section = this.sections[i];
      section.position.z += travel;
      const recycled = section.position.z > 36;
      if (recycled || restarted) {
        const z = restarted ? 16 - i * 20 : section.position.z - 140;
        if (section.userData.district !== model.district) {
          this.removeSection(section); section = this.makeSection(i, model.district);
          this.scene.add(section); this.sections[i] = section;
        }
        section.position.z = z;
      }
      const bunting = section.getObjectByName('bunting');
      if (bunting) bunting.visible = ready || section.position.z < 7;
    }
    const ids = new Set(model.entities.map(e => e.id));
    for (const [id, object] of this.objects) if (!ids.has(id)) {
      this.scene.remove(object);
      if (object instanceof TrafficVehicle) {
        const pool = this.carPool.get(object.userData.poolKey) ?? [];
        pool.push(object); this.carPool.set(object.userData.poolKey, pool);
      } else this.coinPool.push(object);
      this.objects.delete(id);
    }
    for (const entity of model.entities) {
      let obj = this.objects.get(entity.id);
      if (!obj) {
        if (entity.kind === 'coin') {
          obj = this.coinPool.pop();
          if (!obj) {
            const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.43, 0.43, 0.12, 16), material(palette.yellow));
            coin.rotation.x = Math.PI / 2; obj = new THREE.Group(); obj.add(coin);
            const inset = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 16), material(0xffed9c));
            inset.position.z = 0.075; obj.add(inset);
          }
        } else {
          const kind = entity.vehicle ?? 'sedan', key = kind + '-' + entity.color;
          obj = this.carPool.get(key)?.pop() ?? new TrafficVehicle(kind, [0xbc6347, 0x54899a, 0xc6a344, 0x578977][entity.color]);
          obj.userData.poolKey = key;
        }
        obj.userData.kind = entity.kind; this.objects.set(entity.id, obj); this.scene.add(obj);
      }
      obj.position.set((entity.lane - 1) * LANE_WIDTH, entity.kind === 'coin' ? 1.1 + Math.sin(time * 4 + entity.z) * 0.1 : 0, entity.z);
      if (entity.kind === 'coin') obj.rotation.y = time * 2.5;
      else (obj as TrafficVehicle).animate(model.distance, time, model.speed);
    }
    this.crossing.render(model.crossing);
    if (model.phase !== 'paused') this.jeep.body.rotation.x = model.braking && model.speed > 2 ? 0.025 : 0;
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.disposed = true; this.resizeObserver.disconnect();
    const geometries = new Set<THREE.BufferGeometry>();
    const mats = new Set<THREE.Material>();
    const disposeObject = (obj: THREE.Object3D) => obj.traverse(o => {
      if (o instanceof THREE.Mesh) { geometries.add(o.geometry); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => mats.add(m)); }
    });
    disposeObject(this.scene); [...[...this.carPool.values()].flat(), ...this.coinPool].forEach(disposeObject);
    geometries.forEach(g => { if (g !== box) g.dispose(); });
    mats.forEach(m => {
      Object.values(m).forEach(value => { if (value instanceof THREE.Texture) value.dispose(); });
      if (![...materials.values()].includes(m as THREE.MeshStandardMaterial)) m.dispose();
    });
    this.bursts.dispose();
    this.props.dispose();
    this.environmentTarget.dispose();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
