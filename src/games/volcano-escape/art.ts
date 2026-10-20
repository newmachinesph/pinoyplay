import type Phaser from 'phaser';
import { texture, ellipse, palm } from '../../core/rendering/canvas-art';
export function buildVolcanoArt(scene: Phaser.Scene) {
    for (const fragile of [false, true])
        texture(scene, fragile ? 'fragile-rock' : 'basalt-rock', 220, 76, c => {
            const rock = c.createLinearGradient(0, 10, 0, 68);
            rock.addColorStop(0, fragile ? '#be9370' : '#879691');
            rock.addColorStop(.2, fragile ? '#855b49' : '#4a5a63');
            rock.addColorStop(1, '#202b3b');
            c.fillStyle = rock;
            c.beginPath();
            c.moveTo(4, 9);
            c.lineTo(215, 9);
            c.lineTo(202, 46);
            c.lineTo(175, 59);
            c.lineTo(130, 67);
            c.lineTo(92, 61);
            c.lineTo(36, 52);
            c.lineTo(18, 32);
            c.closePath();
            c.fill();
            c.save();
            c.clip();
            for (let i = 0; i < 160; i++) {
                const x = (i * 73) % 220, y = 12 + (i * 29) % 55;
                c.strokeStyle = i % 3 ? '#d8d5b322' : '#111a2a55';
                c.lineWidth = 1 + i % 2;
                c.beginPath();
                c.moveTo(x, y);
                c.lineTo(x + 8 + i % 13, y - 3);
                c.stroke();
            }
            for (let i = 0; i < 9; i++) {
                c.strokeStyle = '#19233177';
                c.lineWidth = 2;
                c.beginPath();
                c.moveTo(17 + i * 25, 13);
                c.lineTo(13 + i * 25, 32);
                c.lineTo(20 + i * 25, 52);
                c.stroke();
                c.strokeStyle = '#afbbb33a';
                c.lineWidth = 1;
                c.beginPath();
                c.moveTo(20 + i * 25, 14);
                c.lineTo(17 + i * 25, 32);
                c.stroke();
            }
            c.restore();
            c.fillStyle = fragile ? '#e4b784' : '#bdc5a1';
            c.beginPath();
            c.moveTo(3, 9);
            c.lineTo(22, 2);
            c.lineTo(204, 2);
            c.lineTo(217, 9);
            c.lineTo(208, 16);
            c.lineTo(13, 16);
            c.closePath();
            c.fill();
            c.strokeStyle = fragile ? '#ffdb9c' : '#e2dfb4';
            c.lineWidth = 2;
            c.beginPath();
            c.moveTo(5, 8);
            c.lineTo(213, 8);
            c.stroke();
            if (fragile) {
                c.strokeStyle = '#5b3c38';
                c.lineWidth = 3;
                c.beginPath();
                c.moveTo(91, 3);
                c.lineTo(108, 13);
                c.lineTo(100, 30);
                c.lineTo(117, 39);
                c.lineTo(111, 63);
                c.stroke();
            }
        });
    texture(scene, 'volcano-sky', 400, 700, c => {
        const sky = c.createLinearGradient(0, 0, 0, 700);
        sky.addColorStop(0, '#293c61');
        sky.addColorStop(.5, '#ad6c79');
        sky.addColorStop(.78, '#efad7b');
        sky.addColorStop(1, '#593e55');
        c.fillStyle = sky;
        c.fillRect(0, 0, 400, 700);
        ellipse(c, 305, 215, 40, 40, '#f8ce94');
        for (let i = 0; i < 12; i++)
            ellipse(c, 70 + i * 13, 245 - i * 10, 28 + i * 3, 15 + i, '#4c405155');
        c.fillStyle = '#61536b';
        c.beginPath();
        c.moveTo(-30, 515);
        c.quadraticCurveTo(95, 400, 184, 267);
        c.lineTo(207, 267);
        c.quadraticCurveTo(285, 405, 440, 515);
        c.closePath();
        c.fill();
        c.fillStyle = '#8b616f';
        c.beginPath();
        c.moveTo(197, 270);
        c.lineTo(219, 340);
        c.lineTo(205, 360);
        c.lineTo(257, 490);
        c.lineTo(350, 515);
        c.lineTo(208, 280);
        c.fill();
        c.strokeStyle = '#ef9c6b';
        c.lineWidth = 3;
        c.beginPath();
        c.moveTo(196, 275);
        c.lineTo(194, 327);
        c.lineTo(217, 370);
        c.stroke();
        for (let j = 0; j < 3; j++) {
            c.fillStyle = ['#56475c', '#3c3b50', '#283447'][j];
            c.beginPath();
            c.moveTo(0, 700);
            for (let i = 0; i < 9; i++)
                c.lineTo(i * 55, 470 + j * 64 + Math.sin(i * 2.3 + j) * 28);
            c.lineTo(400, 700);
            c.fill();
        }
    });
}
