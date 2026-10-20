import Phaser from 'phaser';
import { GameScene, PhaserWorld } from '../../core/rendering/phaser-world';
import { CoconutModel } from './model';
import { buildCoconutArt } from './art';
class CoconutScene extends GameScene<CoconutModel> {
    override preload() { super.preload(); this.load.image('grove-art', `${import.meta.env.BASE_URL}games/coconut-catcher/background.webp`); }
    private basket?: Phaser.GameObjects.Image;
    private basketBack?: Phaser.GameObjects.Image;
    private sprites = new Map<number, Phaser.GameObjects.Image>();
    private caughtSprites = new Map<number, Phaser.GameObjects.Image>();
    protected build() {
        buildCoconutArt(this);
        this.add.image(200, 350, this.textures.exists('grove-art') ? 'grove-art' : 'coast').setDisplaySize(400, 700);
        this.basketBack = this.add.image(200, 573, 'basket').setDisplaySize(114, 77).setDepth(680);
        this.basket = this.add.image(200, 573, 'basket-front').setDisplaySize(114, 77).setDepth(700);
    }
    protected bindInput() { this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (p.y >= 160 && p.y <= 595)
        this.model.drag(p.x / 400); }); this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (p.isDown)
        this.model.drag(p.x / 400); }); }
    protected draw(dt: number) { const m = this.model; this.drawCoconut(m); this.header.setPosition(200, 225).setText(`WIND ${m.wind < 0 ? "←" : "→"} · DODGE THE BRANCHES`); }
    private drawCoconut(m: CoconutModel) {
        const live = new Set(m.items.map(i => i.id));
        for (const [id, sprite] of this.sprites)
            if (!live.has(id)) {
                sprite.destroy();
                this.sprites.delete(id);
            }
        for (const item of m.items) {
            let sprite = this.sprites.get(item.id);
            if (!sprite) {
                sprite = this.add.image(item.x, item.y, item.kind === 'branch' ? 'branch' : item.kind === 'gold' ? 'gold-buko' : 'buko').setDisplaySize(item.kind === 'branch' ? 55 : 42, 48).setDepth(710);
                this.sprites.set(item.id, sprite);
            }
            sprite.setPosition(item.x, item.y).setRotation(Math.sin(item.spin) * .4);
        }
        const catches = new Set(m.catches.map(c => c.id));
        for (const [id, sprite] of this.caughtSprites) if (!catches.has(id)) { sprite.destroy(); this.caughtSprites.delete(id); }
        for (const caught of m.catches) {
            let sprite = this.caughtSprites.get(caught.id);
            if (!sprite) { sprite = this.add.image(m.x, 550, caught.kind === 'gold' ? 'gold-buko' : 'buko').setDepth(690); this.caughtSprites.set(caught.id, sprite); }
            const t = Math.min(1, (m.elapsed - caught.at) / .42);
            sprite.setPosition(m.x + caught.x * (1 - t * .7), 551 + t * 33).setDisplaySize(42 * (1 - t * .2), 48 * (1 - t * .2));
            sprite.setAlpha(Math.min(1, (1 - t) * 4));
        }
        const impact = m.catches.reduce((n, c) => Math.max(n, Math.sin(Math.min(1, (m.elapsed - c.at) / .25) * Math.PI) * 3), 0);
        for (const basket of [this.basket!, this.basketBack!]) basket.setPosition(m.x, 573 + impact).setAngle(m.input.x * -2).setAlpha(m.invincible > 0 ? .65 + Math.sin(m.elapsed * 16) * .2 : 1);
        const g = this.ink;
        g.fillStyle(0x356657, .1).fillEllipse(m.x, 612, 98, 13);
        // Subtle live highlights over the authored shoreline.
        for (let i = 0; i < 7; i++) {
            const x = (i * 71 + m.elapsed * 7) % 450 - 25;
            g.lineStyle(1, 0xffffff, .35).lineBetween(x, 454 + i * 8, x + 24, 454 + i * 8);
        }
    }
}
export class CoconutWorld extends PhaserWorld {
    constructor(host: HTMLElement, model: CoconutModel, tick: (dt: number) => void) { super(host, ready => new CoconutScene('coconut-catcher', model, tick, ready)); }
}
