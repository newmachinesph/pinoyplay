import type Phaser from 'phaser';
export function texture(scene: Phaser.Scene, key: string, w: number, h: number, paint: (c: CanvasRenderingContext2D) => void) {
    const canvas = document.createElement('canvas');
    canvas.width = w * 2;
    canvas.height = h * 2;
    const c = canvas.getContext('2d')!;
    c.scale(2, 2);
    paint(c);
    scene.textures.addCanvas(key, canvas);
}
export function ellipse(c: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string) {
    c.fillStyle = fill;
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    c.fill();
}
export function palm(c: CanvasRenderingContext2D, x: number, y: number, scale = 1, flip = 1) {
    c.save();
    c.translate(x, y);
    c.scale(scale * flip, scale);
    c.strokeStyle = '#8c7450';
    c.lineWidth = 17;
    c.beginPath();
    c.moveTo(-26, 380);
    c.quadraticCurveTo(12, 180, 0, 0);
    c.stroke();
    c.lineWidth = 3;
    c.strokeStyle = '#c4a373';
    for (let i = 1; i < 24; i++) {
        const py = i * 15;
        c.beginPath();
        c.moveTo(-7, py);
        c.lineTo(7, py + 3);
        c.stroke();
    }
    for (let i = 0; i < 9; i++) {
        const angle = i * .65 - 2.5;
        c.save();
        c.rotate(angle);
        c.fillStyle = i % 2 ? '#377748' : '#4d9955';
        c.beginPath();
        c.moveTo(0, 0);
        c.bezierCurveTo(55, -48, 148, -21, 166, 15);
        c.quadraticCurveTo(81, -4, 0, 0);
        c.fill();
        c.strokeStyle = '#a4b764';
        c.lineWidth = 1.5;
        c.beginPath();
        c.moveTo(0, 0);
        c.quadraticCurveTo(86, -23, 166, 15);
        c.stroke();
        for (let n = 1; n < 11; n++) {
            c.beginPath();
            c.moveTo(n * 13, -9);
            c.lineTo(n * 13 + 13, -27 + n * 2);
            c.stroke();
        }
        c.restore();
    }
    for (let i = 0; i < 3; i++)
        ellipse(c, -7 + i * 10, 17 + i % 2 * 9, 11, 14, '#94a551');
    c.restore();
}
