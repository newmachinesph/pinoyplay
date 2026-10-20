import Phaser from 'phaser';
import { COURT, type PatinteroModel } from './model';
import { CourtCharacter } from './character';

class CourtScene extends Phaser.Scene {
  private figures: CourtCharacter[] = [];
  private player!: CourtCharacter;
  private lastLives = 3;
  private lastScore = 0;
  private wasPaused = false;
  private direction!: Phaser.GameObjects.Text;
  private fieldLabels: Phaser.GameObjects.Text[] = [];
  constructor(private model: PatinteroModel, private onTick: (dt: number) => void) { super('court'); }
  preload() {
    this.load.image('court-art', `${import.meta.env.BASE_URL}art/patintero-court.webp`);
    for (const name of ['runner', 'girl', 'boy']) this.load.spritesheet(`run-${name}`, `${import.meta.env.BASE_URL}art/run-${name}.webp`, { frameWidth: 128, frameHeight: 128 });
    this.load.spritesheet('idle-players', `${import.meta.env.BASE_URL}art/idle-players.webp`, { frameWidth: 128, frameHeight: 128 });
  }
  create() {
    if (this.textures.exists('court-art')) {
      this.add.image(195, 380, 'court-art').setDisplaySize(428, 760);
      this.add.rectangle(195, 390, 278, 410, 0xe2d1ad, 0.12);
    } else this.drawNeighborhood();
    const chalk = this.add.graphics();
    chalk.lineStyle(4, 0xfff9dc, 0.9);
    chalk.strokeRect(COURT.left, COURT.top, COURT.right - COURT.left, COURT.bottom - COURT.top);
    chalk.lineBetween(COURT.center, COURT.top, COURT.center, COURT.bottom);
    for (let i = 1; i < 3; i++) chalk.lineBetween(COURT.left, COURT.top + i * 115, COURT.right, COURT.top + i * 115);
    // Broken second strokes give the court the feel of hand-drawn chalk.
    chalk.lineStyle(1, 0xfff9dc, 0.5);
    for (let i = 0; i < 4; i++) chalk.lineBetween(COURT.left + 2, COURT.top + i * 115 + 5, COURT.right - 8, COURT.top + i * 115 + 4);
    this.fieldLabels = [
      this.add.text(195, 164, 'KABILANG DULO', { fontFamily: 'DM Sans', fontSize: '10px', fontStyle: 'bold', color: '#315c55', letterSpacing: 3 }).setOrigin(0.5),
      this.add.text(195, 649, 'BAHAY · SAFE ZONE', { fontFamily: 'DM Sans', fontSize: '10px', fontStyle: 'bold', color: '#315c55', letterSpacing: 2 }).setOrigin(0.5),
    ];
    this.direction = this.add.text(195, 188, '↑ CROSS & COME BACK', { fontFamily: 'DM Sans', fontSize: '11px', fontStyle: 'bold', color: '#174e4d', backgroundColor: '#fff4d7', padding: { x: 10, y: 5 } }).setOrigin(0.5);
    this.figures = this.model.guards.map((_, i) => new CourtCharacter(this, i % 2 ? 'girl' : 'boy', i, true));
    this.player = new CourtCharacter(this, 'runner', 0, true);
    this.player.motion.facing = 2;
    this.player.motion.heading = -Math.PI / 2;
  }
  private drawNeighborhood() {
    const g = this.add.graphics();
    g.fillStyle(0xcebea0).fillRect(0, 0, 390, 760);
    for (let i = 0; i < 400; i++) {
      const x = (i * 131.7) % 390, y = (i * 89.31) % 760;
      g.fillStyle(i % 2 ? 0xf1dfb6 : 0xa6997f, 0.17).fillCircle(x, y, 1 + i % 3);
    }
    for (const side of [0, 1]) {
      for (let j = 0; j < 4; j++) {
        const x = side ? 342 : -62, y = 80 + j * 180;
        g.fillStyle(0x446d62, 0.2).fillRect(x + 9, y + 12, 110, 130);
        g.fillStyle(j % 2 ? 0xb96f51 : 0x77968a).fillRect(x, y, 110, 125);
        for (let n = 0; n < 10; n++) { g.lineStyle(2, 0xe4c7a3, 0.3); g.lineBetween(x, y + n * 12, x + 110, y + n * 12); }
        g.fillStyle(0xebe0b9).fillRect(x + 5, y + 126, 100, 8);
        for (let n = 0; n < 3; n++) {
          const px = side ? 357 : 30, py = y + 145 + n * 8;
          g.fillStyle(0x54856a).fillEllipse(px + n * 6, py, 30, 17);
          g.fillStyle(0x87a979).fillEllipse(px + n * 3, py - 6, 12, 26);
        }
      }
    }
    for (let i = 0; i < 12; i++) g.fillStyle([0xdb7150, 0xe6bd58, 0x548c82][i % 3]).fillTriangle(i * 36, 78, i * 36 + 20, 79, i * 36 + 10, 108);
  }
  update(_time: number, delta: number) {
    this.onTick(delta / 1000);
    const m = this.model;
    const active = m.phase === 'running', paused = m.phase === 'paused';
    if (paused !== this.wasPaused) {
      if (paused) this.tweens.pauseAll(); else this.tweens.resumeAll();
      this.wasPaused = paused;
    }
    for (let i = 0; i < this.figures.length; i++) {
      const p = m.guards[i];
      this.figures[i].updatePose(p.x, p.y, Math.min(delta / 1000, 0.04), m.elapsed, active, paused);
    }
    if (m.lives < this.lastLives) {
      const ring = this.add.circle(this.player.x, this.player.y, 18).setStrokeStyle(3, 0xf17859).setDepth(1000);
      this.tweens.add({ targets: ring, scale: 2.6, alpha: 0, duration: 380, onComplete: () => ring.destroy() });
      this.cameras.main.shake(120, 0.003);
    }
    if (m.score > this.lastScore) {
      const text = this.add.text(m.x, m.y - 58, `+${m.score - this.lastScore}`, { fontFamily: 'DM Sans', fontSize: '15px', fontStyle: 'bold', color: '#fff9dc', stroke: '#245c4e', strokeThickness: 3 }).setOrigin(0.5).setDepth(1001);
      this.tweens.add({ targets: text, y: text.y - 25, alpha: 0, duration: 550, onComplete: () => text.destroy() });
    }
    this.lastLives = m.lives; this.lastScore = m.score;
    this.player.updatePose(m.x, m.y, Math.min(delta / 1000, 0.04), m.elapsed, active, paused, m.input);
    if (!paused) this.player.setInvincible(m.invincible > 0, m.elapsed);
    this.direction.setText(m.returning ? '↓ GET BACK HOME!' : '↑ CROSS & COME BACK');
    this.direction.setVisible(m.phase !== 'ready');
    this.fieldLabels.forEach(label => label.setVisible(m.phase !== 'ready'));
    this.children.depthSort();
  }
}

export class PatinteroWorld {
  game: Phaser.Game;
  constructor(host: HTMLElement, model: PatinteroModel, onTick: (dt: number) => void) {
    this.game = new Phaser.Game({
      type: Phaser.AUTO, parent: host, width: 390, height: 760,
      backgroundColor: '#cfbea0', antialias: true,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: new CourtScene(model, onTick),
      audio: { noAudio: true }, banner: false,
    });
  }
  dispose() { this.game.destroy(true); }
}
