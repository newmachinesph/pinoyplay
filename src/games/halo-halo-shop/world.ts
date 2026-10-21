import Phaser from 'phaser';
import { GameScene, PhaserWorld } from '../../core/rendering/phaser-world';
import { HaloModel, ingredients } from './model';
import { buildHaloArt } from './art';
class HaloScene extends GameScene<HaloModel> {
    override preload() { super.preload(); this.load.image('shop-art', `/games/halo-halo-shop/background.webp`); }
    private labels: Phaser.GameObjects.Text[] = [];
    private recipeKey = '';
    protected build() {
        buildHaloArt(this);
        this.add.image(200, 350, this.textures.exists('shop-art') ? 'shop-art' : 'halo-shop').setDisplaySize(400, 700);
    }
    protected bindInput() { }
    protected draw(dt: number) { const m = this.model; this.drawHalo(m); this.header.setPosition(200, 225).setText('THE ORDER · BUILD LEFT TO RIGHT'); }
    private ingredient(g: Phaser.GameObjects.Graphics, index: number, x: number, y: number, size: number) {
        const color = ingredients[index].color;
        if (index === 0) {
            for (let i = 0; i < 5; i++) {
                g.fillStyle(color).fillEllipse(x + Math.sin(i * 2) * size * .3, y + Math.cos(i * 2) * size * .2, size * .42, size * .25);
            }
        }
        else if (index === 1 || index === 2) {
            for (let i = 0; i < 4; i++) {
                const dx = (i % 2 - .5) * size * .4, dy = (Math.floor(i / 2) - .5) * size * .3;
                g.fillStyle(color).fillRoundedRect(x + dx - size * .2, y + dy - size * .15, size * .4, size * .3, 2);
                g.lineStyle(1, 0xffffff, .7).lineBetween(x + dx - size * .15, y + dy - size * .1, x + dx + size * .1, y + dy - size * .1);
            }
        }
        else if (index === 3) {
            g.fillStyle(0xfff5d7).fillRoundedRect(x - size * .3, y - size * .35, size * .6, size * .7, 3);
            g.fillStyle(0x4789ac).fillRect(x - size * .3, y - size * .05, size * .6, size * .22);
        }
        else if (index === 4) {
            g.fillStyle(color).fillCircle(x, y, size * .38);
            g.fillStyle(0xc08bd7, .7).fillCircle(x - size * .12, y - size * .12, size * .16);
        }
        else {
            g.fillStyle(color).fillRoundedRect(x - size * .42, y - size * .22, size * .84, size * .45, 4);
            g.fillStyle(0xbe783a).fillEllipse(x, y - size * .21, size * .82, size * .22);
        }
    }
    private drawHalo(m: HaloModel) {
        const g = this.ink, key = m.recipe.join(',') + ':' + m.customer;
        if (key !== this.recipeKey) {
            this.recipeKey = key;
            this.labels.forEach(l => l.destroy());
            this.labels = [];
            m.recipe.forEach((i, n) => {
                const x = 200 + (n - (m.recipe.length - 1) / 2) * 55;
                this.labels.push(this.add.text(x, 278, ingredients[i].short, { fontFamily: 'DM Sans', fontSize: '8px', fontStyle: 'bold', color: '#374759' }).setOrigin(.5).setDepth(200));
                this.labels.push(this.add.text(x - 18, 247, String(n + 1), { fontFamily: 'DM Sans', fontSize: '8px', fontStyle: 'bold', color: '#8b6d8c' }).setOrigin(.5).setDepth(200));
            });
        }
        g.fillStyle(0xfff2d7).fillRoundedRect(22, 240, 356, 53, 12);
        m.recipe.forEach((i, n) => this.ingredient(g, i, 200 + (n - (m.recipe.length - 1) / 2) * 55, 260, 29));
        g.fillStyle(0x533823, .24).fillEllipse(161, 491, 133, 20);
        // A wide fluted glass with ordered layers from the bottom upward.
        const left = 104, right = 218, top = 310, bottom = 474;
        g.fillStyle(0xe8faff, .22).fillPoints([{ x: left, y: top }, { x: right, y: top }, { x: 199, y: bottom }, { x: 122, y: bottom }].map(p => new Phaser.Math.Vector2(p.x, p.y)), true);
        m.glass.forEach((index, n) => {
            const y = bottom - 18 - n * 27, width = 77 + n * 5;
            if (index === 4) {
                g.fillStyle(0x70449f).fillCircle(161, y, 34);
                g.fillStyle(0x9763bd).fillCircle(157, y - 6, 30);
                for (let j = 0; j < 14; j++)
                    g.fillStyle(j % 2 ? 0xb486ce : 0x8250ac, .7).fillCircle(143 + Math.sin(j * 2.1) * 18, y - 8 + Math.cos(j * 1.7) * 18, 3 + j % 3);
            }
            else if (index === 5) {
                g.fillStyle(0xd39233).fillRoundedRect(129, y - 14, 64, 25, 5);
                g.fillStyle(0xffcf72).fillRoundedRect(131, y - 12, 60, 20, 4);
                g.fillStyle(0xac6428).fillEllipse(161, y - 13, 63, 14);
                g.fillStyle(0xefb251).fillEllipse(157, y - 15, 47, 8);
            }
            else {
                g.fillStyle(ingredients[index].color, index === 2 ? .8 : 1).fillRoundedRect(161 - width / 2, y - 16, width, 25, 3);
                if (index !== 3)
                    for (let j = 0; j < 6; j++)
                        this.ingredient(g, index, 124 + j * 14, y - 4, 20);
                g.fillStyle(0xffffff, .14).fillRoundedRect(161 - width / 2 + 3, y - 14, width - 6, 5, 2);
            }
        });
        g.lineStyle(3, 0xe9f8ef, .9).strokePoints([{ x: left, y: top }, { x: 122, y: bottom }, { x: 199, y: bottom }, { x: right, y: top }].map(p => new Phaser.Math.Vector2(p.x, p.y)), false);
        g.lineStyle(2, 0xffffff, .85).strokeEllipse(161, top, 114, 13);
        for (const x of [125, 146, 178, 199])
            g.lineStyle(2, 0xffffff, .25).lineBetween(x, 325, 161 + (x - 161) * .7, 466);
        g.lineStyle(5, 0xd8e4d6).lineBetween(161, 475, 161, 490);
        g.fillStyle(0xe2f3e5, .8).fillEllipse(161, 492, 74, 10);
        g.lineStyle(5, 0xc2d4d1).lineBetween(195, 337, 229, 313);
        g.fillStyle(0xeaf5ec).fillEllipse(230, 309, 12, 24);
    }
}
export class HaloWorld extends PhaserWorld {
    constructor(host: HTMLElement, model: HaloModel, tick: (dt: number) => void) { super(host, ready => new HaloScene('halo-halo-shop', model, tick, ready)); }
}
