import Phaser from 'phaser';
import { GameScene, PhaserWorld } from '../../core/rendering/phaser-world';
import { CourtCharacter } from '../patintero/character';
import { VolcanoModel } from './model';
import { buildVolcanoArt } from './art';
import { LavaSurface } from './lava';
class VolcanoScene extends GameScene<VolcanoModel> {
    override preload() { super.preload(); this.load.image('volcano-art', `${import.meta.env.BASE_URL}games/volcano-escape/background.webp`); this.load.image('lava-art', `${import.meta.env.BASE_URL}games/volcano-escape/lava.webp`); }
    private character?: CourtCharacter;
    private rocks = new Map<number, Phaser.GameObjects.Image>();
    private lava!: LavaSurface;
    protected build() {
        buildVolcanoArt(this);
        this.showScorePop = false;
        this.showHeader = false;
        this.add.image(200, 350, this.textures.exists('volcano-art') ? 'volcano-art' : 'volcano-sky').setDisplaySize(400, 700);
        this.character = new CourtCharacter(this, 'runner');
        this.lava = new LavaSurface(this);
    }
    protected bindInput() { }
    protected draw(dt: number) { const m = this.model; this.drawVolcano(m, dt); this.header.setText('↑ KEEP CLIMBING'); }
    private drawVolcano(m: VolcanoModel, dt: number) {
        const g = this.ink;
        const live = new Set(m.platforms.filter(p => p.crumble < 1).map(p => p.id));
        for (const [id, sprite] of this.rocks)
            if (!live.has(id)) {
                sprite.destroy();
                this.rocks.delete(id);
            }
        for (const ledge of m.platforms) {
            const y = 580 - (ledge.y - m.camera);
            let sprite = this.rocks.get(ledge.id);
            if (ledge.crumble >= 1)
                continue;
            if (!sprite) {
                sprite = this.add.image(ledge.x, y, ledge.fragile ? 'fragile-rock' : 'basalt-rock').setOrigin(.5, .12).setDepth(150);
                this.rocks.set(ledge.id, sprite);
            }
            sprite.setVisible(y >= 150 && y <= 650);
            if (y < 150 || y > 650)
                continue;
            const shake = ledge.crumble > 0 ? Math.sin(m.elapsed * 60) * 2 : 0, x = ledge.x + shake;
            sprite.setPosition(x, y).setDisplaySize(ledge.width + 4, 42).setAlpha(1 - ledge.crumble * .45);
            g.fillStyle(0x192536, .25).fillEllipse(x + 5, y + 25, ledge.width, 15);
            g.fillStyle(ledge.fragile ? 0x896150 : 0x4d6170).fillPoints([{ x: x - ledge.width / 2, y }, { x: x + ledge.width / 2, y }, { x: x + ledge.width / 2 - 13, y: y + 25 }, { x: x - 20, y: y + 34 }, { x: x - ledge.width / 2 + 7, y: y + 18 }].map(p => new Phaser.Math.Vector2(p.x, p.y)), true);
            g.fillStyle(ledge.fragile ? 0xd3a075 : 0x9eab95).fillRoundedRect(x - ledge.width / 2, y - 4, ledge.width, 7, 2);
            for (let i = 0; i < 4; i++)
                g.lineStyle(1, 0x202c3e, .6).lineBetween(x - ledge.width / 2 + 15 + i * 21, y + 7, x - ledge.width / 2 + 9 + i * 20, y + 20);
            if (ledge.fragile)
                g.lineStyle(2, 0x4f3741).strokePoints([{ x: x - 9, y: y - 4 }, { x: x + 3, y: y + 3 }, { x: x - 1, y: y + 13 }, { x: x + 10, y: y + 24 }].map(p => new Phaser.Math.Vector2(p.x, p.y)));
        }
        const lavaY = 580 - (m.lava - m.camera);
        this.lava.draw(lavaY, m.elapsed);
        for (let i = 0; i < 18; i++) {
            const y = 700 - (m.elapsed * (15 + i % 4 * 6) + i * 49) % 550;
            g.fillStyle(0xffb564, .3 + i % 3 * .15).fillCircle((i * 79 + Math.sin(m.elapsed + i) * 9) % 400, y, i % 3 + 1);
        }
        this.character!.updatePose(m.x, 580 - (m.y - m.camera) + 15, Math.min(dt, .04), m.elapsed, m.phase === 'running' && (!!m.input.x || m.vy !== 0), m.phase === 'paused', { x: m.facing, y: 0 });
        this.character!.setDepth(600);
        this.character!.setInvincible(m.invincible > 0, m.elapsed);
    }
}
export class VolcanoWorld extends PhaserWorld {
    constructor(host: HTMLElement, model: VolcanoModel, tick: (dt: number) => void) { super(host, ready => new VolcanoScene('volcano-escape', model, tick, ready)); }
}
