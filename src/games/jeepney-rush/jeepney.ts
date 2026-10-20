import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** A deliberately modelled Philippine jeepney. Front is -Z; wheels remain articulated. */
export class Jeepney extends THREE.Group {
  readonly body = new THREE.Group();
  readonly wheels: THREE.Group[] = [];
  readonly steering: THREE.Group[] = [];
  private paint = new THREE.MeshPhysicalMaterial({
    color: 0x087f88, roughness: 0.28, metalness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.2,
  });
  private chrome = new THREE.MeshStandardMaterial({ color: 0xdce7e3, roughness: 0.22, metalness: 0.88, envMapIntensity: 1.7 });
  private cream = new THREE.MeshPhysicalMaterial({ color: 0xffd16c, roughness: 0.35, metalness: 0.18, clearcoat: 0.6 });
  private coral = new THREE.MeshStandardMaterial({ color: 0xe65a37, roughness: 0.4, metalness: 0.18 });
  private dark = new THREE.MeshStandardMaterial({ color: 0x172c33, roughness: 0.82 });
  private glass = new THREE.MeshPhysicalMaterial({
    color: 0x73b7c1, roughness: 0.13, metalness: 0.35, transparent: true, opacity: 0.58,
    side: THREE.DoubleSide, depthWrite: false,
  });
  private red = new THREE.MeshStandardMaterial({ color: 0xd63822, emissive: 0xbd2510, emissiveIntensity: 0.55, roughness: 0.28 });
  private lamp = new THREE.MeshStandardMaterial({ color: 0xfff4c5, emissive: 0xffdd82, emissiveIntensity: 0.35, roughness: 0.22 });
  constructor(private baseColor = 0x087f88) {
    super();
    this.paint.color.setHex(baseColor);
    this.name = 'PinoyPlay jeepney';
    this.add(this.body);
    this.buildBody();
    for (const side of [-1, 1]) for (const z of [-2.02, 1.5]) this.buildWheel(side, z);
    mergeStatic(this.body);
  }
  private mesh(geometry: THREE.BufferGeometry, material: THREE.Material, at: number[], parent: THREE.Group = this.body) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(at[0], at[1], at[2]);
    mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  private box(size: number[], at: number[], material: THREE.Material, radius = 0.035, parent = this.body) {
    return this.mesh(new RoundedBoxGeometry(size[0], size[1], size[2], 2, Math.min(radius, ...size.map(s => s / 3))), material, at, parent);
  }
  private pipe(points: number[][], radius = 0.025, material: THREE.Material = this.chrome) {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p as [number, number, number])));
    return this.mesh(new THREE.TubeGeometry(path, Math.max(4, points.length * 4), radius, 8, false), material, [0, 0, 0]);
  }
  private disc(radius: number, depth: number, at: number[], material: THREE.Material, axis: 'x' | 'z' = 'z', parent = this.body) {
    const mesh = this.mesh(new THREE.CylinderGeometry(radius, radius, depth, 24), material, at, parent);
    if (axis === 'x') mesh.rotation.z = Math.PI / 2; else mesh.rotation.x = Math.PI / 2;
    return mesh;
  }
  private label(text: string, width: number, height: number, at: number[], rotation = 0, bg = '#ffe5a0', fg = '#123e48') {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 1024, 160);
    ctx.strokeStyle = fg; ctx.lineWidth = 5; ctx.strokeRect(10, 10, 1004, 140);
    ctx.font = '800 94px "Barlow Condensed", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = fg; ctx.fillText(text, 512, 83, 960);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = this.mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshStandardMaterial({
      map: texture, roughness: 0.65, metalness: 0.05, side: THREE.DoubleSide,
    }), at);
    mesh.rotation.y = rotation; return mesh;
  }
  private buildBody() {
    // Chassis, floor and the actual open passenger compartment.
    this.box([1.65, 0.2, 4.95], [0, 0.48, -0.05], this.dark);
    this.box([1.91, 0.13, 3.94], [0, 0.78, 0.42], this.chrome);
    this.box([1.72, 0.08, 3.7], [0, 0.87, 0.45], this.dark);
    const seat = new THREE.MeshStandardMaterial({ color: 0x8b3a31, roughness: 0.85 });
    for (const side of [-1, 1]) {
      this.box([0.38, 0.21, 2.6], [side * 0.65, 1.08, 0.75], seat, 0.08);
      this.box([0.1, 0.4, 2.6], [side * 0.84, 1.33, 0.75], seat, 0.05);
      // Rear wheel arch is cut from the sheet metal, not painted onto it.
      const panel = new THREE.Shape();
      panel.moveTo(-1.55, 0.66); panel.lineTo(0.94, 0.66);
      panel.absarc(1.5, 0.66, 0.56, Math.PI, 0, true);
      panel.lineTo(2.4, 0.66); panel.lineTo(2.4, 1.45); panel.lineTo(-1.55, 1.45); panel.closePath();
      const geometry = new THREE.ExtrudeGeometry(panel, { depth: 0.065, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.018, bevelThickness: 0.015, curveSegments: 16 });
      geometry.translate(0, 0, -0.0325); geometry.rotateY(-Math.PI / 2);
      this.mesh(geometry, this.paint, [side * 0.96, 0, 0]);
      this.box([0.075, 0.1, 3.98], [side * 1.0, 1.44, 0.42], this.chrome);
      this.box([0.07, 0.09, 3.8], [side * 1.0, 1.33, 0.42], this.cream);
      this.box([0.055, 0.075, 2.5], [side * 1.005, 0.89, -0.25], this.coral);
      for (let i = 0; i < 5; i++) {
        const z = -1.48 + i * 0.95;
        this.box([0.07, 0.92, 0.065], [side * 0.97, 1.94, z], this.chrome, 0.025);
        if (i < 4) {
          this.box([0.025, 0.64, 0.81], [side * 0.973, 1.98, z + 0.47], this.glass, 0.008);
          this.pipe([[side * 1.01, 1.66, z + 0.08], [side * 1.01, 1.66, z + 0.88]], 0.013);
        }
      }
      this.box([0.08, 0.1, 4.03], [side * 0.98, 2.4, 0.42], this.chrome);
      this.label('MABUHAY', 2.35, 0.25, [side * 1.025, 1.17, -0.3], side * Math.PI / 2, '#087f88', '#fff0b7');
      // Front fender and curved chrome arches.
      this.box([0.48, 0.12, 1.5], [side * 0.9, 1.12, -2.0], this.paint, 0.055);
      for (const z of [-2.02, 1.5]) {
        const arch = this.mesh(new THREE.TorusGeometry(0.55, 0.055, 8, 28, Math.PI), this.chrome, [side * 1.06, 0.55, z]);
        arch.rotation.y = Math.PI / 2;
      }
      this.box([0.28, 0.1, 1.0], [side * 1.02, 0.54, -0.95], this.chrome, 0.03);
      this.box([0.13, 0.3, 0.05], [side * 0.81, 0.99, 2.44], this.red);
      this.box([0.15, 0.08, 0.06], [side * 0.81, 1.22, 2.445], this.lamp);
      this.pipe([[side * 0.93, 2.04, -1.5], [side * 1.21, 2.04, -1.61], [side * 1.21, 2.14, -1.61]], 0.025);
      this.box([0.19, 0.29, 0.07], [side * 1.21, 2.2, -1.61], this.chrome, 0.05);
      this.box([0.145, 0.23, 0.012], [side * 1.21, 2.2, -1.565], this.glass, 0.025);
      // Separate rear grab rails frame a genuinely open doorway.
      this.pipe([[side * 0.5, 0.51, 2.5], [side * 0.5, 1.7, 2.5], [side * 0.43, 2.24, 2.4]], 0.03);
    }
    // Rounded long hood and exposed grille with chrome vertical bars.
    this.box([1.5, 0.44, 1.34], [0, 1.15, -2.16], this.paint, 0.14);
    this.box([0.94, 0.035, 1.2], [0, 1.387, -2.16], this.cream, 0.015);
    this.box([0.045, 0.02, 1.21], [0, 1.412, -2.16], this.chrome, 0.005);
    this.box([1.48, 0.73, 0.12], [0, 1.0, -2.83], this.chrome, 0.08);
    this.box([0.86, 0.55, 0.035], [0, 0.98, -2.9], this.dark, 0.07);
    for (let i = -3; i <= 3; i++) this.box([0.047, 0.5, 0.05], [i * 0.108, 0.98, -2.93], this.chrome, 0.022);
    for (const side of [-1, 1]) {
      this.disc(0.194, 0.095, [side * 0.63, 1.15, -2.91], this.chrome);
      this.disc(0.15, 0.1, [side * 0.63, 1.15, -2.94], this.lamp);
      this.disc(0.075, 0.06, [side * 0.88, 1.05, -2.7], this.coral);
      this.box([0.75, 0.67, 0.045], [side * 0.399, 1.92, -1.57], this.glass, 0.028).rotation.x = -0.1;
      this.pipe([[side * 0.08, 1.67, -1.63], [side * 0.5, 1.89, -1.65]], 0.012, this.dark);
      this.box([0.055, 0.88, 0.075], [side * 0.84, 1.94, -1.55], this.chrome);
      // Hood latches and horizontal side vents.
      this.box([0.018, 0.15, 0.05], [side * 0.76, 1.2, -1.75], this.chrome);
      for (let i = 0; i < 5; i++) this.box([0.018, 0.13, 0.025], [side * 0.757, 1.18, -2.45 + i * 0.12], this.dark, 0.006);
    }
    this.box([0.055, 0.84, 0.075], [0, 1.94, -1.58], this.chrome);
    this.box([1.82, 0.16, 0.14], [0, 1.53, -1.56], this.chrome);
    this.box([2.2, 0.16, 0.21], [0, 0.59, -2.95], this.chrome, 0.07);
    this.pipe([[-0.69, 0.63, -3.04], [-0.69, 0.86, -3.04], [0.69, 0.86, -3.04], [0.69, 0.63, -3.04]], 0.045);
    this.label('PYN 001', 0.55, 0.15, [0, 0.54, -3.065], Math.PI, '#faf4d5');
    this.label('CUBAO  •  QUIAPO', 1.74, 0.26, [0, 2.43, -1.65], Math.PI);
    this.label('INGAT  •  MABUHAY', 1.65, 0.24, [0, 2.38, 2.465], 0);
    this.label('PYN 001', 0.55, 0.15, [0, 0.53, 2.68], 0, '#faf4d5');
    // A thin curved roof, not a rectangular slab.
    const roof = new THREE.Shape();
    roof.moveTo(-1.08, 2.42); roof.bezierCurveTo(-1.12, 2.7, 1.12, 2.7, 1.08, 2.42);
    roof.lineTo(1.02, 2.39); roof.bezierCurveTo(0.97, 2.56, -0.97, 2.56, -1.02, 2.39); roof.closePath();
    this.mesh(new THREE.ExtrudeGeometry(roof, { depth: 4.13, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 20 }), this.cream, [0, 0, -1.68]);
    for (const x of [-0.91, 0.91]) this.pipe([[x, 2.55, -1.55], [x, 2.55, 2.4]], 0.025);
    for (const x of [-0.79, 0.79]) {
      this.pipe([[x, 2.64, -1.3], [x, 2.81, -1.15], [x, 2.81, 2.0], [x, 2.64, 2.15]], 0.026);
      for (const z of [-0.9, 1.8]) this.pipe([[x, 2.64, z], [x, 2.81, z]], 0.02);
    }
    for (let i = 0; i < 7; i++) this.pipe([[-0.8, 2.72, -1.12 + i * 0.53], [0.8, 2.72, -1.12 + i * 0.53]], 0.018);
    for (const x of [-0.55, 0.55]) {
      this.disc(0.09, 0.28, [x, 2.72, -1.42], this.chrome);
      this.disc(0.075, 0.015, [x, 2.72, -1.57], this.dark);
    }
    this.box([1.12, 0.12, 0.4], [0, 0.36, 2.58], this.chrome, 0.025);
    for (let i = 0; i < 6; i++) this.box([1.06, 0.018, 0.014], [0, 0.427, 2.42 + i * 0.06], this.dark, 0.004);
    // Driver and steering wheel, visible through the windshield.
    const skin = new THREE.MeshStandardMaterial({ color: 0xc58b59, roughness: 0.9 });
    this.mesh(new THREE.SphereGeometry(0.16, 16, 12), skin, [-0.43, 1.94, -1.02]);
    this.box([0.31, 0.42, 0.26], [-0.43, 1.6, -1.0], this.coral, 0.09);
    this.mesh(new THREE.SphereGeometry(0.165, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), this.dark, [-0.43, 1.98, -1.02]);
    this.mesh(new THREE.TorusGeometry(0.18, 0.018, 8, 20), this.dark, [-0.43, 1.58, -1.34]).rotation.x = -0.45;
  }
  private buildWheel(side: number, z: number) {
    const pivot = new THREE.Group(); pivot.position.set(side * 1.015, 0.48, z); this.add(pivot);
    const wheel = new THREE.Group(); pivot.add(wheel); this.wheels.push(wheel);
    if (z < 0) this.steering.push(pivot);
    const rubber = new THREE.MeshStandardMaterial({ color: 0x202727, roughness: 0.94 });
    this.disc(0.455, 0.28, [0, 0, 0], rubber, 'x', wheel);
    const shoulder = this.mesh(new THREE.TorusGeometry(0.35, 0.105, 12, 32), rubber, [side * 0.08, 0, 0], wheel);
    shoulder.rotation.y = Math.PI / 2;
    this.disc(0.29, 0.3, [0, 0, 0], this.chrome, 'x', wheel);
    this.disc(0.225, 0.315, [0, 0, 0], this.dark, 'x', wheel);
    for (let i = 0; i < 8; i++) {
      const spoke = this.box([0.32, 0.045, 0.5], [0, 0, 0], this.chrome, 0.012, wheel);
      spoke.rotation.x = i * Math.PI / 4;
    }
    this.disc(0.115, 0.34, [0, 0, 0], this.cream, 'x', wheel);
    for (let i = 0; i < 6; i++) this.disc(0.024, 0.355, [0, Math.sin(i * Math.PI / 3) * 0.16, Math.cos(i * Math.PI / 3) * 0.16], this.chrome, 'x', wheel);
    mergeStatic(wheel);
  }
  animate(distance: number, time: number, speed: number, steer: number, running: boolean, hit: boolean) {
    this.wheels.forEach(wheel => wheel.rotation.x = -distance / 0.455);
    this.steering.forEach(pivot => pivot.rotation.y = THREE.MathUtils.clamp(steer * 0.13, -0.3, 0.3));
    this.body.position.y = running ? Math.sin(time * 16) * Math.min(0.025, speed * 0.001) : 0;
    this.body.rotation.z = running ? THREE.MathUtils.clamp(steer * -0.022, -0.06, 0.06) : 0;
    this.paint.color.setHex(hit && Math.floor(time * 12) % 2 === 0 ? 0xbf5c36 : this.baseColor);
  }
}

export function mergeStatic(group: THREE.Group) {
  group.updateMatrixWorld(true);
  const bins = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const remove: THREE.Mesh[] = [];
  // Only direct meshes: nested groups may be animated joints.
  for (const object of [...group.children]) {
    if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) continue;
    const g = (object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone()).applyMatrix4(object.matrix);
    const list = bins.get(object.material) ?? []; list.push(g); bins.set(object.material, list); remove.push(object);
  }
  remove.forEach(mesh => { mesh.removeFromParent(); mesh.geometry.dispose(); });
  for (const [material, parts] of bins) {
    const geometry = mergeGeometries(parts);
    // Preserve every part if a future mesh has incompatible attributes.
    for (const result of geometry ? [geometry] : parts) {
      const mesh = new THREE.Mesh(result, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    }
    if (geometry) parts.forEach(part => part.dispose());
  }
}
