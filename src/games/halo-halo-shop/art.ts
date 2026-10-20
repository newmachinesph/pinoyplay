import type Phaser from 'phaser';
import { texture, ellipse, palm } from '../../core/rendering/canvas-art';
export function buildHaloArt(scene: Phaser.Scene) {
    texture(scene, 'halo-shop', 400, 700, c => {
        c.fillStyle = '#d9c7d9';
        c.fillRect(0, 0, 400, 700);
        for (let i = 0; i < 8; i++) {
            c.fillStyle = i % 2 ? '#f1d283' : '#a67cba';
            c.fillRect(i * 50, 40, 50, 105);
            ellipse(c, i * 50 + 25, 145, 25, 14, c.fillStyle as string);
        }
        c.fillStyle = '#f1e1c4';
        c.fillRect(20, 180, 360, 230);
        c.fillStyle = '#70a4a1';
        c.fillRect(30, 190, 340, 205);
        c.fillStyle = '#42685f';
        c.fillRect(30, 340, 340, 55);
        for (let i = 0; i < 7; i++) {
            c.fillStyle = '#cbb985';
            c.fillRect(35 + i * 52, 318, 35, 58);
            c.fillStyle = ['#89485e', '#65a07a', '#d6ba64', '#a786b8'][i % 4];
            c.fillRect(37 + i * 52, 330, 31, 43);
            c.fillStyle = '#e6d3a2';
            c.fillRect(33 + i * 52, 314, 39, 6);
            ellipse(c, 43 + i * 52, 340, 3, 20, '#ffffff33');
        }
        c.fillStyle = '#bd8c66';
        c.fillRect(0, 400, 400, 300);
        for (let i = 0; i < 12; i++) {
            c.strokeStyle = '#e1b38b88';
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(0, 403 + i * 28);
            c.lineTo(400, 403 + i * 28);
            c.stroke();
        }
        c.fillStyle = '#f6e6bd';
        c.fillRect(0, 400, 400, 15);
        c.font = '800 24px "Barlow Condensed", sans-serif';
        c.fillStyle = '#f7edce';
        c.textAlign = 'center';
        c.fillText('MERIENDA NA!', 200, 224);
    });
}
