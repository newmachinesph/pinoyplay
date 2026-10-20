import Phaser from 'phaser';
import { CharacterMotion } from './motion';
import { drawRunner, facingHeading } from './runner-rig';

export class CourtCharacter extends Phaser.GameObjects.Container {
  readonly motion = new CharacterMotion();
  readonly art: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private halo?: Phaser.GameObjects.Arc;
  private pointer?: Phaser.GameObjects.Triangle;
  private dustDistance = 0;
  private idleRow: number;
  private baseScale: number;
  private rigTexture?: Phaser.Textures.CanvasTexture;
  private rigCycle = 0;
  private rigAmount = 0;
  private visualHeading?: number;
  constructor(scene: Phaser.Scene, readonly kind: 'runner' | 'girl' | 'boy', variant = 0, articulated = false) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.idleRow = kind === 'runner' ? 0 : kind === 'girl' ? 1 : 2;
    this.baseScale = kind === 'runner' ? 1 : 0.95 + variant % 3 * 0.035;
    this.shadow = scene.add.ellipse(0, 0, 27, 12, 0x173d35, 0.25);
    this.add(this.shadow);
    if (kind === 'runner') {
      this.halo = scene.add.circle(0, 0, 19).setStrokeStyle(2, 0xffdb6c, 0.95).setScale(1, 0.65);
      this.pointer = scene.add.triangle(0, 0, 0, -4, 7, 0, 0, 4, 0xffdc75).setOrigin(0.5);
      this.add([this.halo, this.pointer]);
    }
    this.art = scene.add.image(0, 1, 'idle-players', this.idleRow * 4).setDisplaySize(64, 64).setOrigin(0.5, 0.92);
    if (articulated) {
      this.rigTexture = scene.textures.createCanvas(`court-rig-${kind}-${variant}`, 128, 128)!;
      this.art.setTexture(this.rigTexture.key).setOrigin(.5, 111 / 128);
      this.once('destroy', () => scene.textures.remove(this.rigTexture!.key));
    }
    this.add(this.art);
  }
  updatePose(x: number, y: number, dt: number, time: number, active: boolean, paused: boolean, intent?: { x: number; y: number }) {
    this.setPosition(x, y).setDepth(y);
    if (paused) return;
    const travelled = this.motion.sample(x, y, dt, active, intent);
    const running = this.motion.moving;
    if (this.rigTexture) {
      // Turn the articulated body in the court plane, never rotate the whole sprite.
      this.visualHeading ??= facingHeading(this.motion.facing);
      const turn = Math.atan2(Math.sin(this.motion.heading - this.visualHeading), Math.cos(this.motion.heading - this.visualHeading));
      this.visualHeading += turn * (1 - Math.exp(-dt * 20));
      const target = running ? Math.min(1, this.motion.speed / 168) : 0;
      this.rigAmount += (target - this.rigAmount) * (1 - Math.exp(-dt * 20));
      if (running) this.rigCycle = (this.rigCycle + travelled / (59.3 * Math.max(.22, this.rigAmount))) % 1;
      drawRunner(this.rigTexture.context, this.kind, this.visualHeading, this.rigCycle, this.rigAmount, time, this.scene.textures.get('idle-players').getSourceImage() as HTMLImageElement);
      this.rigTexture.refresh();
      this.art.setDisplaySize(72 * this.baseScale, 72 * this.baseScale).setPosition(0, 1).setRotation(0).setFlipX(false);
      this.shadow.setScale(1 - this.rigAmount * .05, 1);
      this.updatePointer();
      return;
    }
    const mirrorIdle = !running && this.kind === 'runner' && this.motion.facing === 3;
    this.art.setTexture(running ? `run-${this.kind}` : 'idle-players', running ? this.motion.frame : this.idleRow * 4 + (mirrorIdle ? 1 : this.motion.facing));
    this.art.setFlipX(mirrorIdle);
    const stride = running ? Math.sin(this.motion.gait * Math.PI) : 0;
    this.art.setDisplaySize(64 * this.baseScale, 64 * this.baseScale);
    this.art.y = 1 - (running ? Math.abs(stride) * 2.5 : Math.sin(time * 2 + this.idleRow) * 0.4);
    const lean = running ? Math.cos(this.motion.heading) * 0.045 + stride * 0.018 : 0;
    this.art.rotation = Phaser.Math.Linear(this.art.rotation, lean, Math.min(1, dt * 18));
    this.shadow.setScale(1 - Math.abs(stride) * 0.12, 1);
    this.updatePointer();
    this.dustDistance += running ? travelled : 0;
    if (this.dustDistance > 23) {
      this.dustDistance = 0;
      const dust = this.scene.add.ellipse(x - Math.cos(this.motion.heading) * 8, y + 2, 7, 4, 0xf4e1b8, 0.45).setDepth(y - 1);
      this.scene.tweens.add({ targets: dust, alpha: 0, scaleX: 2.5, scaleY: 2, y: y + 8, duration: 320, onComplete: () => dust.destroy() });
    }
  }
  private updatePointer() {
    if (!this.pointer) return;
    const heading = this.visualHeading ?? this.motion.heading;
    this.pointer.setPosition(Math.cos(heading) * 23, Math.sin(heading) * 14);
    this.pointer.rotation = heading;
  }
  setInvincible(value: boolean, time: number) {
    this.art.setAlpha(value ? 0.68 + Math.sin(time * 18) * 0.25 : 1);
    this.halo?.setStrokeStyle(value ? 3 : 2, value ? 0xffffff : 0xffdb6c, 0.95);
  }
}
