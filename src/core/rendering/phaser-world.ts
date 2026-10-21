import Phaser from 'phaser';
import type { GameModel } from '../game-model';
export abstract class GameScene<M extends GameModel> extends Phaser.Scene {
    protected ink!: Phaser.GameObjects.Graphics;
    protected header!: Phaser.GameObjects.Text;
    protected showScorePop = true;
    protected showHeader = true;
    private lastLives = 3;
    private lastScore = 0;
    private paused = false;
    constructor(key: string, protected model: M, private onTick: (dt: number) => void, private onReady: () => void) { super(key); }
    preload() {
        this.load.image('court-art', `/art/patintero-court.webp`);
        for (const name of ['runner', 'girl', 'boy'])
            this.load.spritesheet(`run-${name}`, `/art/run-${name}.webp`, { frameWidth: 128, frameHeight: 128 });
        this.load.spritesheet('idle-players', `/art/idle-players.webp`, { frameWidth: 128, frameHeight: 128 });
    }
    create() {
        this.build();
        this.ink = this.add.graphics().setDepth(100);
        this.header = this.add.text(200, 152, '', { fontFamily: 'DM Sans', fontSize: '10px', fontStyle: 'bold', color: '#fff4db', backgroundColor: '#142e49cc', padding: { x: 12, y: 6 } }).setOrigin(.5).setDepth(1200);
        this.bindInput();
        this.onReady();
    }
    protected bindInput() { }
    protected abstract build(): void;
    protected abstract draw(dt: number): void;
    update(_time: number, delta: number) {
        this.onTick(delta / 1000);
        const m = this.model;
        if (this.paused !== (m.phase === 'paused')) {
            this.paused = m.phase === 'paused';
            if (this.paused)
                this.tweens.pauseAll();
            else
                this.tweens.resumeAll();
        }
        this.ink.clear();
        this.draw(delta / 1000);
        this.header.setVisible(this.showHeader && m.phase !== 'ready');
        if (m.lives < this.lastLives) {
            this.cameras.main.shake(130, .004);
            const flash = this.add.rectangle(200, 350, 400, 700, 0xff593b, .16).setDepth(1000);
            this.tweens.add({ targets: flash, alpha: 0, duration: 250, onComplete: () => flash.destroy() });
        }
        if (m.score > this.lastScore && this.showScorePop) {
            const text = this.add.text(200, 340, `+${m.score - this.lastScore}`, { fontFamily: 'Barlow Condensed', fontSize: '31px', fontStyle: 'bold', color: '#fff0ac', stroke: '#214938', strokeThickness: 4 }).setOrigin(.5).setDepth(1100);
            this.tweens.add({ targets: text, y: 300, alpha: 0, duration: 700, onComplete: () => text.destroy() });
        }
        this.lastLives = m.lives;
        this.lastScore = m.score;
    }
}
export class PhaserWorld {
    game: Phaser.Game;
    ready: Promise<void>;
    constructor(host: HTMLElement, createScene: (ready: () => void) => Phaser.Scene) {
        let resolve!: () => void;
        this.ready = new Promise(r => resolve = r);
        this.game = new Phaser.Game({ type: Phaser.AUTO, parent: host, width: 400, height: 700, backgroundColor: '#d3c5a8', antialias: true, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: createScene(resolve), audio: { noAudio: true }, banner: false });
    }
    dispose() { this.game.destroy(true); }
}
