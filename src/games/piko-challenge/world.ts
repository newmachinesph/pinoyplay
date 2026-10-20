import Phaser from 'phaser';
import { GameScene, PhaserWorld } from '../../core/rendering/phaser-world';
import { CourtCharacter } from '../patintero/character';
import { PikoModel, pikoSquares } from './model';
class PikoScene extends GameScene<PikoModel> {
    private character?: CourtCharacter;
    protected build() {
        this.showHeader = false;
        this.add.image(200, 350, 'court-art').setDisplaySize(400, 700);
        // Chalk drawn straight onto the alley: a soft dusting plus doubled, slightly offset strokes.
        this.add.rectangle(200, 345, 236, 437, 0x6d5a41, .22);
        const chalk = this.add.graphics();
        for (const s of pikoSquares) {
            const j = (s.n * 37 % 5) - 2;
            chalk.fillStyle(0xfff8e6, .14).fillRect(s.x - 38, s.y - 27, 76, 54);
            chalk.lineStyle(3.5, 0xfff8e6, .92).strokeRect(s.x - 39, s.y - 28, 78, 56);
            chalk.lineStyle(1.5, 0xffffff, .45).strokeRect(s.x - 39 + j * .6, s.y - 28 - j * .5, 78 + j * .4, 56);
            this.add.text(s.x, s.y, String(s.n), { fontFamily: 'Barlow Condensed', fontSize: '30px', fontStyle: 'bold', color: '#fffaf0' })
                .setOrigin(.5).setStroke('#4a3822', 4);
        }
        this.add.text(200, 575, 'BAHAY · START HERE', { fontFamily: 'DM Sans', fontSize: '10px', color: '#4b6657', fontStyle: 'bold', letterSpacing: 2 }).setOrigin(.5);
        this.character = new CourtCharacter(this, 'runner');
    }
    protected bindInput() { this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.y >= 160 && p.y <= 595)
        this.model.tap(p.x / 400, p.y / 700); }); }
    protected draw(dt: number) { const m = this.model; this.drawPiko(m, dt); this.header.setText(m.objective); }
    private drawPiko(m: PikoModel, dt: number) {
        const s = m.target, g = this.ink;
        g.fillStyle(0xf9d75c, .32).fillRoundedRect(s.x - 37, s.y - 26, 74, 52, 3);
        g.lineStyle(3, 0xffdf61, 1).strokeRoundedRect(s.x - 38, s.y - 27, 76, 54, 3);
        g.lineStyle(3, 0xffffff, .85).beginPath().arc(s.x, s.y, 24, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(0, m.progress)).strokePath();
        this.character!.updatePose(m.position.x, m.position.y, Math.min(dt, .04), m.elapsed, m.hop < 1, m.phase === 'paused');
        this.character!.art.y = 1 - Math.sin(m.hop * Math.PI) * 23;
        this.character!.setDepth(600);
        this.character!.setInvincible(m.invincible > 0, m.elapsed);
    }
}
export class PikoWorld extends PhaserWorld {
    constructor(host: HTMLElement, model: PikoModel, tick: (dt: number) => void) { super(host, ready => new PikoScene('piko-challenge', model, tick, ready)); }
}
