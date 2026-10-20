import * as THREE from 'three';
import { CROSSING_SECONDS, type Crossing } from './model';
import { mergeStatic } from './jeepney';

class Walker extends THREE.Group {
  private limbs: THREE.Group[] = [];
  constructor(shirt: number, variant: number) {
    super();
    const skin = new THREE.MeshStandardMaterial({ color: [0xb9794c, 0xd79d67, 0xa86e44][variant], roughness: 0.86 });
    const cloth = new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.9 });
    const pants = new THREE.MeshStandardMaterial({ color: 0x294750, roughness: 0.9 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x272421, roughness: 0.95 });
    const shoe = new THREE.MeshStandardMaterial({ color: 0xe5dcc0, roughness: 0.9 });
    const add = (parent: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
      const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = true; parent.add(mesh); return mesh;
    };
    add(this, new THREE.CapsuleGeometry(0.19, 0.28, 4, 10), cloth, 0, 1.05, 0);
    add(this, new THREE.SphereGeometry(0.17, 16, 12), skin, 0, 1.48, -0.015);
    add(this, new THREE.SphereGeometry(0.176, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hair, 0, 1.51, 0);
    add(this, new THREE.SphereGeometry(0.047, 8, 6), skin, 0, 1.47, -0.17);
    if (variant === 1) add(this, new THREE.SphereGeometry(0.1, 10, 8), hair, 0, 1.5, 0.18);
    for (const side of [-1, 1]) {
      const leg = new THREE.Group(); leg.position.set(side * 0.105, 0.83, 0); this.add(leg); this.limbs.push(leg);
      add(leg, new THREE.CapsuleGeometry(0.075, 0.57, 4, 8), pants, 0, -0.36, 0);
      add(leg, new THREE.BoxGeometry(0.17, 0.1, 0.29), shoe, 0, -0.75, -0.055);
    }
    for (const side of [-1, 1]) {
      const arm = new THREE.Group(); arm.position.set(side * 0.23, 1.2, 0); this.add(arm); this.limbs.push(arm);
      add(arm, new THREE.CapsuleGeometry(0.065, 0.2, 4, 8), cloth, 0, -0.12, 0);
      add(arm, new THREE.CapsuleGeometry(0.048, 0.22, 4, 8), skin, 0, -0.35, -0.01);
      if (variant === 2 && side === 1) {
        const bag = new THREE.MeshStandardMaterial({ color: 0xcda85d, roughness: 1 });
        add(arm, new THREE.BoxGeometry(0.2, 0.28, 0.23), bag, 0, -0.6, 0);
      }
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.27, 20), new THREE.MeshBasicMaterial({ color: 0x123e37, transparent: true, opacity: 0.18, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.015; this.add(shadow);
    this.limbs.forEach(mergeStatic); mergeStatic(this);
  }
  pose(time: number, walking: boolean) {
    const swing = walking ? Math.sin(time * 8) * 0.5 : 0;
    this.limbs.forEach((limb, i) => limb.rotation.x = swing * (i === 0 || i === 3 ? 1 : -1));
  }
}

export class PedestrianCrossing extends THREE.Group {
  private people: Walker[] = [];
  private red = new THREE.MeshStandardMaterial({ color: 0xe45137, emissive: 0xe23b20, emissiveIntensity: 0.7 });
  private green = new THREE.MeshStandardMaterial({ color: 0x54bfa0, emissive: 0x44e6b2, emissiveIntensity: 0 });
  constructor() {
    super();
    const paint = new THREE.MeshStandardMaterial({ color: 0xfff3d8, roughness: 0.96 });
    const metal = new THREE.MeshStandardMaterial({ color: 0x364c4b, roughness: 0.65 });
    const box = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); mesh.position.set(x, y, z); this.add(mesh); return mesh;
    };
    for (let i = 0; i < 13; i++) box(0.43, 0.02, 2.6, -4.5 + i * 0.75, 0.012, 0, paint);
    box(9.8, 0.02, 0.16, 0, 0.012, 2.35, paint);
    for (const side of [-1, 1]) {
      box(0.1, 3.1, 0.1, side * 5.5, 1.55, 0, metal);
      box(0.42, 0.8, 0.25, side * 5.5, 2.75, 0, metal);
      for (const [index, mat] of [this.red, this.green].entries()) {
        const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.12, 16), mat);
        lamp.position.set(side * 5.5, 2.95 - index * 0.37, 0.131); this.add(lamp);
      }
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#f5c549'; ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#194a4c'; ctx.lineWidth = 9; ctx.strokeRect(5, 5, 118, 118);
      ctx.fillStyle = '#194a4c'; ctx.beginPath(); ctx.arc(66, 29, 9, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(63, 44); ctx.lineTo(58, 72); ctx.lineTo(39, 100); ctx.moveTo(58, 72); ctx.lineTo(80, 101); ctx.moveTo(62, 49); ctx.lineTo(81, 65); ctx.moveTo(62, 49); ctx.lineTo(42, 62); ctx.stroke();
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshStandardMaterial({ map, side: THREE.DoubleSide }));
      sign.position.set(side * 5.5, 1.9, 0.14); this.add(sign);
    }
    for (let i = 0; i < 3; i++) {
      const person = new Walker([0xe3b947, 0xe97b57, 0x399f94][i], i);
      this.people.push(person); this.add(person);
    }
    mergeStatic(this); this.visible = false;
  }
  render(crossing: Crossing | undefined) {
    this.visible = !!crossing;
    if (!crossing) return;
    this.position.z = crossing.z;
    this.red.emissiveIntensity = crossing.phase === 'cleared' ? 0 : 0.9;
    this.green.emissiveIntensity = crossing.phase === 'cleared' ? 1 : 0;
    for (let i = 0; i < this.people.length; i++) {
      const progress = crossing.phase === 'cleared' ? 1 : Math.max(0, Math.min(1, (crossing.elapsed - i * 0.35) / (CROSSING_SECONDS - 0.9)));
      const person = this.people[i];
      person.position.set(crossing.direction * (-6.1 + progress * 12.2), 0.025, (i - 1) * 0.7);
      person.rotation.y = -crossing.direction * Math.PI / 2;
      person.pose(crossing.elapsed + i * 0.2, crossing.phase === 'walking' && progress > 0 && progress < 1);
    }
  }
}
