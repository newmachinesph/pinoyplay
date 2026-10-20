import type { Facing } from './motion';

type Point = { x: number; y: number; z: number };
type Kind = 'runner' | 'girl' | 'boy';
const TAU = Math.PI * 2;
const smooth = (t: number) => t * t * (3 - 2 * t);

/** One full left/right stride. The support foot moves backwards at ground speed. */
export function footPose(cycle: number, amount = 1) {
  const t = ((cycle % 1) + 1) % 1;
  if (t < .5) return { forward: (17 - 68 * t) * amount, lift: 0, planted: true };
  const swing = (t - .5) * 2;
  return { forward: (-17 + 34 * smooth(swing)) * amount, lift: Math.sin(swing * Math.PI) * 8 * amount, planted: false };
}

/** Fixed-length two-bone leg: the knee bends forwards during recovery. */
export function kneeBetween(hip: Point, ankle: Point): Point {
  const dy = ankle.y - hip.y, dz = ankle.z - hip.z;
  const distance = Math.max(.001, Math.hypot(dy, dz));
  const bend = Math.sqrt(Math.max(0, 13.4 ** 2 - (distance / 2) ** 2));
  return { x: hip.x, y: (hip.y + ankle.y) / 2 - dz / distance * bend, z: (hip.z + ankle.z) / 2 + dy / distance * bend };
}

/** Canvas rig, projected into the court's overhead view. No rotating flat cutouts. */
export function drawRunner(ctx: CanvasRenderingContext2D, kind: Kind, heading: number, cycle: number, amount: number, time: number, headArt?: CanvasImageSource) {
  ctx.clearRect(0, 0, 128, 128);
  const fx = Math.cos(heading), fy = Math.sin(heading), sx = fy, sy = -fx;
  const project = (p: Point) => ({ x: 64 + (p.x * sx + p.y * fx) * 1.55, y: 111 + (p.x * sy + p.y * fy) * .82 - p.z * 1.55 });
  const depth = (p: Point) => p.x * sy + p.y * fy + p.z * .45;
  const shirt = kind === 'runner' ? ['#65c5b4', '#259788', '#146b69'] : ['#f9967d', '#df6658', '#a93740'];
  const skin = ['#eab47c', '#c98b56', '#925832'];
  const paint = (x: number, y: number, radius: number, colors: string[]) => {
    const gradient = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    gradient.addColorStop(0, colors[0]); gradient.addColorStop(.55, colors[1]); gradient.addColorStop(1, colors[2]);
    return gradient;
  };
  const ellipse = (p: Point, rx: number, ry: number, colors: string[], angle = 0) => {
    const c = project(p); ctx.beginPath(); ctx.ellipse(c.x, c.y, rx, ry, angle, 0, TAU);
    ctx.fillStyle = paint(c.x, c.y, Math.max(rx, ry), colors); ctx.fill();
    ctx.lineWidth = .8; ctx.strokeStyle = '#2a292c66'; ctx.stroke();
  };
  const bone = (a: Point, b: Point, width: number, colors: string[]) => {
    const p = project(a), q = project(b);
    ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
    ctx.lineWidth = width + 1.6; ctx.strokeStyle = '#322e3466'; ctx.stroke();
    ctx.lineWidth = width; ctx.strokeStyle = paint((p.x + q.x) / 2, (p.y + q.y) / 2, width, colors); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(p.x - 1, p.y - 1); ctx.lineTo(q.x - 1, q.y - 1);
    ctx.lineWidth = 1; ctx.strokeStyle = '#fff5cf35'; ctx.stroke();
  };
  const phase = cycle * TAU, bounce = (1 - Math.cos(phase * 2)) * .65 * amount;
  const hipZ = 22.5 + bounce, lean = amount * 2.8;
  const parts: { depth: number; draw: () => void }[] = [];
  const add = (p: Point, draw: () => void) => parts.push({ depth: depth(p), draw });
  for (const side of [-1, 1]) {
    const foot = footPose(cycle + (side === 1 ? .5 : 0), amount);
    const hip = { x: side * 4, y: 0, z: hipZ };
    const ankle = { x: side * 4.2, y: foot.forward, z: 2 + foot.lift };
    const knee = kneeBetween(hip, ankle);
    add({ ...hip, y: (ankle.y + hip.y) / 2, z: 9 }, () => {
      bone(hip, knee, 9, ['#45566b', '#29394d', '#192638']);
      bone(knee, ankle, 5.8, skin);
      bone(hip, { x: knee.x, y: hip.y + (knee.y - hip.y) * .65, z: hip.z + (knee.z - hip.z) * .65 }, 10, ['#45566b', '#29394d', '#192638']);
      const toe = { ...ankle, y: ankle.y + 2.8, z: ankle.z - .2 };
      ellipse({ ...toe, z: toe.z - .8 }, 5.3, 3.7, ['#fff6dd', '#d1d4ce', '#8a9a9b'], Math.atan2(fy * .82, fx * 1.55));
      ellipse(toe, 4.7, 3.5, kind === 'runner' ? ['#f8e7bc', '#d5b568', '#85723f'] : ['#ecebe1', '#8aa1a5', '#4c6872'], Math.atan2(fy * .82, fx * 1.55));
      bone({ ...toe, y: toe.y + .2, z: toe.z + 1 }, { ...toe, y: toe.y + 1.6, z: toe.z + 1 }, 1.2, ['#fff9e4', '#fff9e4', '#fff9e4']);
    });
    // The arm opposite the advancing leg swings forward; the elbow stays bent.
    const swing = -foot.forward * .56;
    const shoulder = { x: side * 7.5, y: lean, z: 36 + bounce };
    const elbow = { x: side * (9 + amount), y: swing * .7 + lean, z: 28.5 + bounce + Math.max(0, swing) * .18 };
    const hand = { x: side * 8.5, y: swing + 4.5 * amount + lean, z: 29 + bounce + Math.max(0, swing) * .4 - (1 - amount) * 5 };
    add(elbow, () => {
      bone(shoulder, elbow, 7.4, skin);
      bone(shoulder, { x: shoulder.x + (elbow.x - shoulder.x) * .6, y: shoulder.y + (elbow.y - shoulder.y) * .6, z: shoulder.z - 4.5 }, 10.4, shirt);
      bone(elbow, hand, 6, skin); ellipse(hand, 3.9, 4.1, skin);
    });
  }
  add({ x: 0, y: lean, z: 32 }, () => {
    const leftHip = project({ x: -6, y: 0, z: hipZ }), rightHip = project({ x: 6, y: 0, z: hipZ });
    const leftShoulder = project({ x: -8, y: lean, z: 37 + bounce }), rightShoulder = project({ x: 8, y: lean, z: 37 + bounce });
    ctx.beginPath(); ctx.moveTo(leftHip.x, leftHip.y); ctx.lineTo(leftShoulder.x, leftShoulder.y);
    ctx.quadraticCurveTo((leftShoulder.x + rightShoulder.x) / 2, Math.min(leftShoulder.y, rightShoulder.y) - 4, rightShoulder.x, rightShoulder.y);
    ctx.lineTo(rightHip.x, rightHip.y); ctx.quadraticCurveTo((leftHip.x + rightHip.x) / 2, Math.max(leftHip.y, rightHip.y) + 4, leftHip.x, leftHip.y);
    ctx.fillStyle = paint(64, (leftHip.y + leftShoulder.y) / 2, 18, shirt); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = shirt[2]; ctx.stroke();
    bone({ x: -4, y: lean + 1, z: 35 + bounce }, { x: 4, y: lean + 1, z: 35 + bounce }, 1, [shirt[0], shirt[1], shirt[2]]);
  });
  parts.sort((a, b) => a.depth - b.depth).forEach(p => p.draw());
  // Head and hair turn in projection, keeping the face on the travel side.
  const head = { x: Math.sin(phase) * .25 * amount, y: lean + .6, z: 43.5 + bounce + Math.sin(time * 2) * .12 * (1 - amount) };
  const c = project(head);
  if (headArt) {
    // Reuse the painted face/hair/cap from the standing atlas as a head bone.
    // The torso and all limb joints remain independently articulated.
    const facing = Math.abs(fy) >= Math.abs(fx) ? (fy < 0 ? 2 : 0) : (fx < 0 ? 1 : 3);
    const mirrored = kind === 'runner' && facing === 3;
    const column = mirrored ? 1 : facing, row = kind === 'runner' ? 0 : kind === 'girl' ? 1 : 2;
    ctx.save(); ctx.translate(c.x, c.y - 4); if (mirrored) ctx.scale(-1, 1);
    ctx.beginPath(); ctx.ellipse(0, -8, 25, 21, 0, 0, TAU); ctx.clip();
    ctx.drawImage(headArt, column * 128 + 28, row * 128 + 8, 72, 56, -25, -25, 50, 39);
    ctx.restore();
    return;
  }
  if (kind === 'girl') {
    ellipse({ x: 0, y: head.y - 5 - Math.sin(phase) * amount, z: head.z + 1 }, 7, 10, ['#51423d', '#302b2e', '#171c25'], -fx * .4);
  }
  ellipse(head, 12.5, 13.4, skin);
  const face = { x: c.x + fx * 5.2, y: c.y + fy * 3 + 1.3 };
  // Only the visible side has features. Back views never show eyes through hair.
  if (fy > -.5) {
    for (const side of [-1, 1]) {
      const ex = face.x + sx * side * 4.5, ey = face.y + sy * side * 2;
      if (side * fx > .8) continue;
      ctx.fillStyle = '#fff8e2'; ctx.beginPath(); ctx.ellipse(ex, ey, 2.5, 2.6, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#302b29'; ctx.beginPath(); ctx.ellipse(ex + fx * .6, ey + .4, 1.5, 2, 0, 0, TAU); ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = '#473128'; ctx.beginPath(); ctx.moveTo(ex - 2, ey - 3); ctx.lineTo(ex + 2, ey - 3.4); ctx.stroke();
    }
    ctx.fillStyle = '#af6b42'; ctx.beginPath(); ctx.ellipse(face.x + fx * 1.5, face.y + 4, 1.7, 1.2, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#874633'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(face.x, face.y + 6, 2, .2, Math.PI - .2); ctx.stroke();
  }
  if (kind === 'runner') {
    ellipse({ ...head, y: head.y - .5, z: head.z + 7 }, 13.5, 9.7, ['#ffe298', '#ecc45b', '#af8032']);
    ellipse({ ...head, y: head.y + 7, z: head.z + 4.5 }, 10, 4.4, ['#ffe39b', '#e1ad43', '#9e6e2a'], Math.atan2(sy * .82, sx * 1.55));
    const seam = project({ ...head, y: head.y - 1, z: head.z + 12 });
    ctx.strokeStyle = '#b78d4366'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(seam.x, seam.y - 2); ctx.lineTo(seam.x + fx * 5, seam.y + 6); ctx.stroke();
  } else {
    ellipse({ ...head, y: head.y - 2.5, z: head.z + 6 }, 13, 10, ['#544338', '#302b2b', '#1a2028']);
    if (fy > -.4) for (let i = -1; i <= 1; i++) ellipse({ x: i * 3.4, y: head.y + 4, z: head.z + 6 - Math.abs(i) }, 3.6, 4.4, ['#514036', '#302a29', '#1a2028'], fx * .4);
    if (kind === 'girl') ellipse({ x: 0, y: head.y - 5, z: head.z + 5 }, 3.4, 2.2, ['#ffac86', '#d96560', '#9e3a42']);
  }
}

export const facingHeading = (facing: Facing) => [Math.PI / 2, Math.PI, -Math.PI / 2, 0][facing];
