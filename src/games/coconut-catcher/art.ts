import type Phaser from 'phaser';
import { texture, ellipse, palm } from '../../core/rendering/canvas-art';
export function buildCoconutArt(scene: Phaser.Scene) {
    for (const gold of [false, true])
        texture(scene, gold ? 'gold-buko' : 'buko', 80, 90, c => {
            const gradient = c.createRadialGradient(26, 25, 4, 40, 47, 39);
            gradient.addColorStop(0, gold ? '#fff4a0' : '#d4e883');
            gradient.addColorStop(.5, gold ? '#edbd3b' : '#91b74e');
            gradient.addColorStop(1, gold ? '#9f6727' : '#426d36');
            ellipse(c, 40, 46, 31, 36, gradient as unknown as string);
            c.strokeStyle = gold ? '#fff3ad88' : '#d9e3a777';
            c.lineWidth = 1;
            for (let i = 0; i < 9; i++) {
                c.beginPath();
                c.moveTo(40 + Math.sin(i) * 5, 11);
                c.quadraticCurveTo(i * 7 + 8, 39, 37 + i, 78);
                c.stroke();
            }
            ellipse(c, 40, 12, 9, 5, '#687644');
            ellipse(c, 31, 29, 7, 12, '#ffffff28');
            if (gold) {
                c.fillStyle = '#fff6bd';
                c.font = 'bold 25px sans-serif';
                c.textAlign = 'center';
                c.fillText('★', 41, 55);
            }
        });
    texture(scene, 'basket', 140, 95, c => {
        ellipse(c, 70, 76, 61, 10, '#23484933');
        c.fillStyle = '#a76d34';
        c.beginPath();
        c.moveTo(10, 23);
        c.lineTo(130, 23);
        c.lineTo(112, 80);
        c.quadraticCurveTo(70, 92, 28, 80);
        c.closePath();
        c.fill();
        c.save();
        c.clip();
        c.lineWidth = 4;
        for (let i = -10; i < 140; i += 10) {
            c.strokeStyle = i % 20 ? '#d3a35c' : '#825128';
            c.beginPath();
            c.moveTo(i, 20);
            c.lineTo(i + 25, 90);
            c.stroke();
        }
        for (let i = 28; i < 90; i += 9) {
            c.strokeStyle = i % 2 ? '#b98143' : '#e5b873';
            c.beginPath();
            c.moveTo(10, i);
            c.quadraticCurveTo(70, i + 13, 130, i);
            c.stroke();
        }
        c.restore();
        ellipse(c, 70, 24, 61, 17, '#d7a464');
        ellipse(c, 70, 23, 53, 11, '#6e4b2e');
        c.strokeStyle = '#ebc38a';
        c.lineWidth = 3;
        c.beginPath();
        c.ellipse(70, 22, 59, 15, 0, 0, Math.PI * 2);
        c.stroke();
    });
    texture(scene, 'branch', 90, 80, c => {
        c.strokeStyle = '#795138';
        c.lineWidth = 12;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(15, 60);
        c.lineTo(71, 17);
        c.stroke();
        c.lineWidth = 6;
        c.beginPath();
        c.moveTo(40, 40);
        c.lineTo(32, 15);
        c.moveTo(51, 32);
        c.lineTo(78, 41);
        c.stroke();
        c.strokeStyle = '#b28b5c';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(18, 57);
        c.lineTo(70, 17);
        c.stroke();
        ellipse(c, 29, 16, 7, 13, '#738b47');
    });
    // Separate the far rim/interior from the near wicker wall for catches.
    texture(scene, 'basket-front', 140, 95, c => {
        c.drawImage(scene.textures.get('basket').getSourceImage() as HTMLImageElement, 0, 0, 140, 95);
        c.globalCompositeOperation = 'destination-out';
        c.fillRect(0, 0, 140, 24);
        c.globalCompositeOperation = 'source-over';
        c.strokeStyle = '#f0cc91'; c.lineWidth = 3;
        c.beginPath(); c.ellipse(70, 23, 59, 15, 0, 0, Math.PI); c.stroke();
    });
    texture(scene, 'coast', 400, 700, c => {
        const sky = c.createLinearGradient(0, 0, 0, 700);
        sky.addColorStop(0, '#8dd7e4');
        sky.addColorStop(.57, '#e3eee0');
        sky.addColorStop(.58, '#3eacb6');
        sky.addColorStop(.77, '#8ed9cb');
        sky.addColorStop(.78, '#f2dba4');
        sky.addColorStop(1, '#c9b37d');
        c.fillStyle = sky;
        c.fillRect(0, 0, 400, 700);
        ellipse(c, 290, 135, 37, 37, '#fff4bb');
        for (let i = 0; i < 14; i++)
            ellipse(c, (i * 83) % 440, 180 + (i % 3) * 25, 40, 12, '#ffffff38');
        c.fillStyle = '#6ba99b';
        c.beginPath();
        c.moveTo(200, 406);
        c.bezierCurveTo(260, 390, 263, 330, 285, 365);
        c.bezierCurveTo(320, 350, 324, 395, 400, 406);
        c.fill();
        for (let i = 0; i < 20; i++) {
            c.strokeStyle = '#e3fff266';
            c.lineWidth = 1.5;
            c.beginPath();
            c.moveTo((i * 39) % 400, 420 + i * 5);
            c.lineTo((i * 39) % 400 + 40, 420 + i * 5);
            c.stroke();
        }
        // Nipa rest hut at the edge of the grove.
        c.fillStyle = '#9c7447';
        c.fillRect(-12, 418, 90, 63);
        c.fillStyle = '#594d36';
        c.fillRect(30, 440, 24, 41);
        for (let i = 0; i < 12; i++) {
            c.fillStyle = '#b1935e';
            c.fillRect(i * 7, 420, 2, 60);
        }
        c.fillStyle = '#a28b52';
        c.beginPath();
        c.moveTo(-30, 424);
        c.lineTo(32, 367);
        c.lineTo(103, 424);
        c.closePath();
        c.fill();
        for (let i = 0; i < 20; i++) {
            c.strokeStyle = '#d0b97d';
            c.beginPath();
            c.moveTo(32, 374);
            c.lineTo(-24 + i * 6, 420);
            c.stroke();
        }
        palm(c, 5, 153, 1.05);
        palm(c, 390, 113, 1.17, -1);
        for (let i = 0; i < 120; i++)
            ellipse(c, (i * 137) % 400, 552 + (i * 37) % 148, 1.5, .6, '#a99c6855');
    });
}
