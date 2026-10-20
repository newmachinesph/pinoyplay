import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Jeepney, mergeStatic } from './jeepney';
import type { VehicleKind } from './model';

/** Small authored vehicles with real glass profiles, door details and rolling rims. */
export class TrafficVehicle extends THREE.Group {
  private body = new THREE.Group();
  private wheels: THREE.Group[] = [];
  private jeep?: Jeepney;
  private paint: THREE.MeshPhysicalMaterial;
  private chrome = new THREE.MeshStandardMaterial({ color: 0xc9ddd9, roughness: 0.23, metalness: 0.8 });
  private dark = new THREE.MeshStandardMaterial({ color: 0x162c32, roughness: 0.85 });
  private glass = new THREE.MeshPhysicalMaterial({ color: 0x22515e, roughness: 0.14, metalness: 0.45, clearcoat: 1 });
  private light = new THREE.MeshStandardMaterial({ color: 0xffedb0, emissive: 0xffda90, emissiveIntensity: 0.4 });
  private red = new THREE.MeshStandardMaterial({ color: 0xbc3928, emissive: 0xe62d13, emissiveIntensity: 0.4 });
  constructor(readonly kind: VehicleKind, color: number) {
    super();
    this.paint = new THREE.MeshPhysicalMaterial({ color: kind === 'taxi' ? 0xf7ecce : color, roughness: 0.3, metalness: 0.25, clearcoat: 0.7 });
    if (kind === 'jeepney') {
      this.jeep = new Jeepney(color); this.jeep.scale.setScalar(0.82); this.add(this.jeep);
      // These unused instance materials have no GPU resources yet.
      return;
    }
    this.add(this.body);
    const van = kind === 'van', halfLength = van ? 2.05 : 1.76, axle = van ? 1.3 : 1.08;
    this.box([1.6, 0.16, halfLength * 2 - 0.15], [0, 0.4, 0], this.dark);
    this.box([1.7, 0.48, halfLength * 2], [0, 0.77, 0], this.paint, 0.13);
    // Outer panels cut upward around the wheel openings.
    for (const side of [-1, 1]) {
      const shape = new THREE.Shape();
      shape.moveTo(-halfLength, 0.43); shape.lineTo(-axle - 0.4, 0.43);
      shape.absarc(-axle, 0.43, 0.4, Math.PI, 0, true);
      shape.lineTo(axle - 0.4, 0.43); shape.absarc(axle, 0.43, 0.4, Math.PI, 0, true);
      shape.lineTo(halfLength, 0.43); shape.lineTo(halfLength, 1.0); shape.lineTo(-halfLength, 1.0); shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: false, curveSegments: 12 });
      geo.rotateY(-Math.PI / 2); this.mesh(geo, this.paint, [side * 0.91, 0, 0]);
      this.box([0.05, 0.07, axle * 2 - 0.9], [side * 0.93, 0.45, 0], this.chrome);
    }
    if (van) this.buildVan(); else this.buildSedan();
    for (const side of [-1, 1]) {
      this.box([0.23, 0.17, 0.24], [side * 1.0, van ? 1.42 : 1.2, van ? -1.25 : -0.7], this.paint, 0.06);
      this.box([0.18, 0.115, 0.018], [side * 1.0, van ? 1.42 : 1.2, van ? -1.12 : -0.57], this.glass, 0.01);
      this.box([0.48, 0.19, 0.07], [side * 0.59, 0.87, -halfLength - 0.02], this.light, 0.035);
      this.box([van ? 0.2 : 0.47, van ? 0.44 : 0.18, 0.07], [side * 0.7, van ? 1.02 : 0.88, halfLength + 0.025], this.red, 0.03);
      for (const z of [van ? -1.13 : -0.44, 0.65]) {
        this.box([0.035, 0.045, 0.18], [side * 0.938, 0.96, z], this.chrome, 0.012);
        this.pipe([[side * 0.938, 0.55, z + 0.27], [side * 0.938, 1.03, z + 0.27]], this.dark, 0.008);
      }
    }
    this.box([1.13, 0.18, 0.055], [0, 0.67, -halfLength - 0.03], this.dark, 0.025);
    for (const y of [0.63, 0.7]) this.box([1.08, 0.018, 0.07], [0, y, -halfLength - 0.05], this.chrome, 0.004);
    for (const z of [-halfLength - 0.035, halfLength + 0.035]) {
      this.box([1.72, 0.12, 0.11], [0, 0.47, z], this.chrome, 0.04);
      this.label('PYN ' + (van ? '304' : kind === 'taxi' ? '218' : '106'), [0.46, 0.13], [0, 0.72, z + Math.sign(z) * 0.05], z < 0 ? Math.PI : 0);
    }
    mergeStatic(this.body);
    for (const side of [-1, 1]) for (const z of [-axle, axle]) this.wheel(side, z);
  }
  private mesh(geo: THREE.BufferGeometry, mat: THREE.Material, at: number[], parent = this.body) {
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(at[0], at[1], at[2]);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private box(size: number[], at: number[], mat: THREE.Material, radius = 0.025, parent = this.body) {
    return this.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(radius, ...size.map(n => n / 3))), mat, at, parent);
  }
  private pipe(points: number[][], mat = this.chrome, radius = 0.018) {
    return this.mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2]))), 4, radius, 6, false), mat, [0, 0, 0]);
  }
  private quad(points: number[][], mat: THREE.Material) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]); geo.computeVertexNormals();
    return this.mesh(geo, mat, [0, 0, 0]);
  }
  private label(text: string, size: number[], at: number[], rotation = 0, bg = '#ffedb8') {
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
    const ctx = canvas.getContext('2d')!; ctx.fillStyle = bg; ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#19414a'; ctx.fillText(text, 128, 34, 238);
    const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
    const sign = this.mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshStandardMaterial({ map, roughness: 0.6, side: THREE.DoubleSide }), at);
    sign.rotation.y = rotation;
  }
  private buildSedan() {
    // Sloped front/rear glass and separate pillars give the cabin a real silhouette.
    this.glass.side = THREE.DoubleSide;
    this.quad([[-0.78, 1.03, -0.87], [0.78, 1.03, -0.87], [0.64, 1.58, -0.48], [-0.64, 1.58, -0.48]], this.glass);
    this.quad([[-0.64, 1.58, 0.64], [0.64, 1.58, 0.64], [0.78, 1.03, 1.1], [-0.78, 1.03, 1.1]], this.glass);
    for (const side of [-1, 1]) {
      this.quad([[side * 0.79, 1.03, -0.84], [side * 0.65, 1.58, -0.47], [side * 0.65, 1.58, 0.63], [side * 0.79, 1.03, 1.08]], this.glass);
      for (const z of [-1, 1]) this.pipe([[side * 0.79, 1.02, z < 0 ? -0.88 : 1.1], [side * 0.65, 1.6, z < 0 ? -0.49 : 0.65]], this.paint, 0.035);
      this.pipe([[side * 0.79, 1.02, 0.1], [side * 0.65, 1.59, 0.1]], this.dark, 0.025);
      this.pipe([[side * 0.79, 1.03, -0.84], [side * 0.79, 1.03, 1.08]]);
      this.pipe([[side * 0.1, 1.05, -0.87], [side * 0.56, 1.17, -0.78]], this.dark, 0.01);
    }
    this.box([1.36, 0.105, 1.22], [0, 1.61, 0.08], this.paint, 0.045);
    this.box([1.64, 0.055, 0.7], [0, 1.025, -1.3], this.paint, 0.018);
    this.box([1.65, 0.045, 0.59], [0, 1.025, 1.4], this.paint, 0.018);
    if (this.kind === 'taxi') {
      this.box([0.62, 0.24, 0.2], [0, 1.78, 0.03], this.light, 0.04);
      this.label('TAXI', [0.58, 0.18], [0, 1.78, -0.078], Math.PI);
      this.label('TAXI', [0.58, 0.18], [0, 1.78, 0.138]);
      for (const side of [-1, 1]) {
        this.label('MANILA', [0.86, 0.2], [side * 0.94, 0.79, 0.23], side * Math.PI / 2, '#f6ead0');
        for (let i = 0; i < 14; i++) this.box([0.015, 0.045, 0.09], [side * 0.942, 0.56 + i % 2 * 0.045, -0.56 + i * 0.09], this.dark, 0.004);
      }
    }
  }
  private buildVan() {
    this.box([1.78, 1.0, 3.3], [0, 1.42, 0.35], this.paint, 0.12);
    this.box([1.7, 0.1, 3.25], [0, 1.96, 0.35], this.paint, 0.04);
    this.glass.side = THREE.DoubleSide;
    this.quad([[-0.79, 1.16, -1.72], [0.79, 1.16, -1.72], [0.73, 1.83, -1.3], [-0.73, 1.83, -1.3]], this.glass);
    this.box([1.7, 0.18, 0.55], [0, 1.06, -1.74], this.paint, 0.045);
    for (const side of [-1, 1]) {
      this.quad([[side * 0.79, 1.15, -1.72], [side * 0.73, 1.84, -1.3], [side * 0.89, 1.84, -1.29], [side * 0.89, 1.02, -1.29]], this.paint);
      this.pipe([[side * 0.79, 1.14, -1.73], [side * 0.73, 1.86, -1.3]], this.paint, 0.035);
    }
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) this.box([0.035, 0.56, 0.83], [side * 0.9, 1.56, -0.73 + i * 0.93], this.glass, 0.015);
      this.pipe([[side * 0.925, 1.17, -0.17], [side * 0.925, 1.17, 1.77]], this.chrome, 0.013);
      this.pipe([[side * 0.92, 0.54, -0.25], [side * 0.92, 1.88, -0.25]], this.dark, 0.008);
    }
    for (const side of [-1, 1]) this.box([0.69, 0.56, 0.035], [side * 0.4, 1.55, 2.02], this.glass, 0.028);
    this.pipe([[0, 0.58, 2.055], [0, 1.9, 2.055]], this.dark, 0.012);
    this.box([0.3, 0.055, 0.045], [0.2, 1.14, 2.065], this.chrome);
    this.pipe([[-0.55, 1.21, -1.69], [0.1, 1.27, -1.65]], this.dark, 0.012);
  }
  private wheel(side: number, z: number) {
    const wheel = new THREE.Group(); wheel.position.set(side * 0.89, 0.36, z); this.add(wheel); this.wheels.push(wheel);
    const tire = this.mesh(new THREE.CylinderGeometry(0.355, 0.355, 0.23, 24), this.dark, [0, 0, 0], wheel); tire.rotation.z = Math.PI / 2;
    const rim = this.mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.245, 24), this.chrome, [0, 0, 0], wheel); rim.rotation.z = Math.PI / 2;
    for (let i = 0; i < 5; i++) {
      const spoke = this.box([0.26, 0.035, 0.4], [0, 0, 0], this.dark, 0.008, wheel); spoke.rotation.x = i * Math.PI / 5;
    }
    const hub = this.mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.265, 12), this.chrome, [0, 0, 0], wheel); hub.rotation.z = Math.PI / 2;
    mergeStatic(wheel);
  }
  animate(distance: number, time: number, speed: number) {
    this.wheels.forEach(w => w.rotation.x = -distance / 0.355);
    this.body.position.y = speed > 0 ? Math.sin(time * 12 + this.id) * 0.012 : 0;
    this.jeep?.animate(distance / 0.82, time, speed, 0, speed > 0, false);
  }
}
