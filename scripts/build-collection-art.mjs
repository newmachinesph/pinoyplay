import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import opentype from 'opentype.js';

const root = process.cwd();
const manifest = JSON.parse(await fs.readFile(path.join(root, 'docs/art/collection-prompts.json'), 'utf8'));
const revision = JSON.parse(await fs.readFile(path.join(root, 'docs/art/poster-sources-v2.json'), 'utf8'));
for (const asset of manifest) {
  const output = path.join(root, asset.output);
  await fs.mkdir(path.dirname(output), { recursive: true });
  const poster = revision.posters.find(p => asset.output === `public/games/${p.id}/cover.webp`);
  let image = sharp(poster?.path ?? asset.source);
  image = asset.kind === 'logo' ? image.trim().resize({ width: 660 })
    : asset.kind === 'background' ? image.resize(720, 1260, { fit: 'cover' })
    : image.resize(1024, 683, { fit: 'cover' });
  await image.webp({ quality: asset.kind === 'logo' ? 92 : poster ? 88 : 84 }).toFile(output);
}
await sharp(revision.court).resize(900, 1600).webp({ quality: 90 }).toFile(path.join(root, 'public/art/patintero-court.webp'));
await sharp(revision.lava).resize(768, 768).webp({ quality: 88 }).toFile(path.join(root, 'public/games/volcano-escape/lava.webp'));

const fontBytes = await fs.readFile(path.join(root, 'node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff'));
const font = opentype.parse(fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength));
const logos = [
  ['jeepney-rush', 'JEEPNEY', 'RUSH', '#fcd116', -4, 'M-28 0h56v25h-56zM-20-16h40v16h-40zM-19 25v9m38-9v9M-21 10h42'],
  ['patintero', 'PATINTERO', 'LARONG KALYE', '#fcd116', 0, 'M-25-22h50v53h-50zM0-22v53M-25-5h50M-25 13h50'],
  ['tricycle-parking', 'TRICYCLE', 'PARKING', '#fcd116', -3, 'M-22-24v56m0-55h24q25 0 25 18T2-4h-24'],
  ['island-boat-racing', 'ISLAND BOAT', 'RACING', '#a3f0ee', -3, 'M-30 8h60l-12 22h-36zM0-30v38m0-37 24 29H0M-36 36q9-9 18 0t18 0t18 0t18 0'],
  ['tumbang-preso', 'TUMBANG', 'PRESO', '#ffda70', 4, 'M-20-24h40v54h-40zM-20-14h40M-20 20h40M-7-6v17m14-17v17'],
  ['basketball-sa-kanto', 'BASKETBALL', 'SA KANTO', '#ffc264', -3, 'M-29 4a29 29 0 1 0 58 0 29 29 0 1 0-58 0M-29 4h58M0-25v58M-20-17q25 21 0 42M20-17q-25 21 0 42'],
  ['piko-challenge', 'PIKO', 'CHALLENGE', '#ffd1e2', 3, 'M-13 7h26v26h-26zM-26-19h52V7h-52zM0-19V7M-13-45h26v26h-26z'],
  ['halo-halo-shop', 'HALO-HALO', 'SHOP', '#fbe4ff', -2, 'M-25-10h50l-8 44h-34zM-22-10q-3-27 12-27 10-12 21 0 17 0 14 27M8-15l13-32M-15 9h29'],
  ['coconut-catcher', 'COCONUT', 'CATCHER', '#e6f4a2', 4, 'M-29 5q0-29 29-29t29 29q0 30-29 30T-29 5M-10-9l1 2M7-12l1 2M0 2l1 2M-19 10q12 20 30 11'],
  ['volcano-escape', 'VOLCANO', 'ESCAPE', '#ffcf68', -3, 'M-37 32-12-15h24l25 47M-12-15 9 13l11-8M-3-24q-11-13 0-20m15 20q11-13 0-20'],
];
function lettering(text, maxWidth, height) {
  const glyph = font.getPath(text, 0, 0, 100);
  const bounds = glyph.getBoundingBox();
  const scale = Math.min(maxWidth / (bounds.x2 - bounds.x1), height / (bounds.y2 - bounds.y1));
  const width = (bounds.x2 - bounds.x1) * scale;
  // Explicit numeric serialization avoids NaN output from opentype 2's optimizer.
  const coordinates = { M: ['x', 'y'], L: ['x', 'y'], Q: ['x1', 'y1', 'x', 'y'], C: ['x1', 'y1', 'x2', 'y2', 'x', 'y'], Z: [] };
  const d = glyph.commands.map(command => command.type + coordinates[command.type].map(key => {
    const value = command[key];
    if (!Number.isFinite(value)) throw new Error(`Invalid glyph coordinate in ${text}`);
    return value.toFixed(3);
  }).join(' ')).join(' ');
  return { d, scale, x: (640 - width) / 2 - bounds.x1 * scale, offsetY: -bounds.y1 * scale };
}
for (const [id, line1, line2, color, angle, motif] of logos) {
  await fs.mkdir(path.join(root, `public/games/${id}`), { recursive: true });
  const first = lettering(line1, 510, 91);
  const second = lettering(line2, 450, line2.length > 11 ? 44 : 69);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 270" role="img" aria-label="${line1} ${line2}">
<g transform="rotate(${angle} 320 140)">
<path d="M49 100 579 72 593 220 69 248Z" fill="#071d49" stroke="#fff" stroke-width="4" stroke-linejoin="round"/>
<path d="M54 213 590 185 585 230 63 258Z" fill="#ce1126"/>
<g transform="translate(567 48)" stroke="#071d49" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle r="43" fill="${color}" stroke="#fff" stroke-width="5"/><path d="${motif}" transform="scale(.7)" stroke-width="6"/></g>
<g fill="#fff" stroke="#071d49" stroke-width="2.5" paint-order="stroke" stroke-linejoin="round"><path d="${first.d}" transform="translate(${first.x} ${85 + first.offsetY}) scale(${first.scale})"/></g>
<g fill="${color}" stroke="#071d49" stroke-width="2.5" paint-order="stroke" stroke-linejoin="round"><path d="${second.d}" transform="translate(${second.x} ${183 + second.offsetY}) scale(${second.scale})"/></g>
</g></svg>`;
  await fs.writeFile(path.join(root, `public/games/${id}/logo.svg`), svg);
}

// A small native vector companion to the generated wordmark, for PWA icons.
const rays = Array.from({ length: 8 }, (_, i) => `<path d="M119 34h18l5 43h-28z" transform="rotate(${i * 45} 128 128)"/>`).join('');
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><rect width="256" height="256" rx="54" fill="#0038a8"/><g fill="#fcd116">${rays}<circle cx="128" cy="128" r="61"/></g><path d="M108 92q-6-3-6 5v62q0 8 7 4l51-30q8-5 0-10Z" fill="#fff"/></svg>`;
await fs.writeFile(path.join(root, 'public/brand/mark.svg'), icon);
await fs.writeFile(path.join(root, 'public/icon.svg'), icon);
for (const size of [192, 512]) await sharp(Buffer.from(icon)).resize(size, size).png().toFile(path.join(root, `public/icon-${size}.png`));
console.log(`Built ${manifest.length} generated images, ${logos.length} outlined game logos, and PWA icons.`);
