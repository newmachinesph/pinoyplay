import Phaser from 'phaser';

/** Layered molten surface with drifting basalt crust and a readable hot edge. */
export class LavaSurface {
  private texture: Phaser.Textures.CanvasTexture;
  private lastTime = -1;
  private lastLevel = -1;
  private crust?: CanvasImageSource;
  constructor(scene: Phaser.Scene) {
    this.texture = scene.textures.createCanvas('molten-lava', 400, 700)!;
    scene.add.image(200, 350, this.texture.key).setDepth(650);
    if (scene.textures.exists('lava-art')) this.crust = scene.textures.get('lava-art').getSourceImage() as HTMLImageElement;
  }
  draw(level: number, time: number) {
    if (Math.abs(time - this.lastTime) < 1 / 30 && Math.abs(level - this.lastLevel) < 1) return;
    this.lastTime = time; this.lastLevel = level;
    const c = this.texture.context;
    c.clearRect(0, 0, 400, 700);
    if (level > 735) { this.texture.refresh(); return; }
    const surface = (x: number) => level + Math.sin(x * .04 + time * 1.3) * 2.2 + Math.sin(x * .095 - time * 1.8) * 1.2;
    const glow = c.createLinearGradient(0, level - 35, 0, level + 10);
    glow.addColorStop(0, '#ff731000'); glow.addColorStop(.7, '#ff82102d'); glow.addColorStop(1, '#ffc349bb');
    c.fillStyle = glow; c.fillRect(0, level - 35, 400, 50);
    const path = () => { c.beginPath(); c.moveTo(0, surface(0)); for (let x = 6; x <= 402; x += 6) c.lineTo(x, surface(x)); c.lineTo(400, 700); c.lineTo(0, 700); c.closePath(); };
    path();
    const molten = c.createLinearGradient(0, level, 0, level + 230);
    molten.addColorStop(0, '#ffd46c'); molten.addColorStop(.045, '#ff962d'); molten.addColorStop(.3, '#ec511b'); molten.addColorStop(1, '#8e231f');
    c.fillStyle = molten; c.fill();
    c.save(); c.clip();
    if (this.crust) {
      // Slowly advect the detailed crust beneath a separately animated molten edge.
      c.save();
      const top = level + 7 + time * 5 % 400;
      for (let y = top - 400; y < 700; y += 400) c.drawImage(this.crust, 0, y, 400, 400);
      const heat = c.createLinearGradient(0, level, 0, level + 42);
      heat.addColorStop(0, '#ffd46c'); heat.addColorStop(.3, '#ff8b2bc0'); heat.addColorStop(1, '#ff521000');
      c.fillStyle = heat; c.fillRect(0, level, 400, 42);
      c.restore();
    } else for (let row = 0; row < 13; row++) for (let col = -1; col < 9; col++) {
      const n = row * 13 + col, x = col * 55 + (row % 2) * 26 + Math.sin(time * .3 + row) * 9;
      const y = level + 25 + row * 41 + Math.sin(n * 3 + time * .45) * 7;
      const width = 18 + Math.sin(n * 7.31) * 7, height = 9 + (Math.cos(n * 4) + 1) * 5;
      c.beginPath();
      for (let p = 0; p < 7; p++) {
        const a = p / 7 * Math.PI * 2, jag = 1 + Math.sin(n + p * 7) * .2;
        const px = x + Math.cos(a) * width * jag, py = y + Math.sin(a) * height * jag;
        if (!p) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.closePath(); c.fillStyle = row < 2 ? '#7b3025' : '#4e2429'; c.fill();
      c.strokeStyle = '#ffae3955'; c.lineWidth = 2; c.stroke();
      c.beginPath(); c.moveTo(x - width * .5, y - 2); c.lineTo(x, y + 3); c.lineTo(x + width * .5, y);
      c.strokeStyle = '#a74a2e'; c.lineWidth = 1.4; c.stroke();
    }
    for (let i = 0; i < 13; i++) {
      const t = (time * .32 + i * .173) % 1, x = (i * 97 + 23) % 400, y = level + 12 + i % 4 * 24;
      c.beginPath(); c.ellipse(x, y, 3 + t * 12, 2 + t * 4, 0, 0, Math.PI * 2);
      c.strokeStyle = `rgba(255,219,112,${(1 - t) * .65})`; c.lineWidth = 1.8; c.stroke();
    }
    c.restore();
    c.beginPath(); c.moveTo(0, surface(0));
    for (let x = 4; x <= 400; x += 4) c.lineTo(x, surface(x));
    c.strokeStyle = '#fff3a4'; c.lineWidth = 2.5; c.stroke();
    for (let i = 0; i < 20; i++) {
      const t = (time * .25 + i * .093) % 1, x = (i * 73) % 400 + Math.sin(t * 4 + i) * 12;
      c.fillStyle = `rgba(255,${170 + i % 60},63,${Math.sin(t * Math.PI) * .8})`;
      c.beginPath(); c.ellipse(x, level - t * (40 + i % 4 * 14), 1.1 + i % 2, 2.5, -.3, 0, Math.PI * 2); c.fill();
    }
    this.texture.refresh();
  }
}
