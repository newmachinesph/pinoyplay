import sharp from 'sharp';

// Normalize generated grid cells into equal, padded runtime frames. Alpha is preserved.
const [source, destination, rowsArg = '4'] = process.argv.slice(2);
if (!source || !destination) throw new Error('Usage: node scripts/pack-sprites.mjs source.png output.webp [rows]');
const cols = 4, rows = Number(rowsArg), cell = 128;
const { data, info } = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const alpha = (x, y) => data[(y * info.width + x) * 4 + 3];
function divisions(length, count, horizontal) {
  const result = [0];
  for (let i = 1; i < count; i++) {
    const expected = length * i / count, radius = length / count * 0.09;
    let best = Math.round(expected), minimum = Infinity;
    for (let p = Math.round(expected - radius); p < expected + radius; p++) {
      let sum = 0;
      for (let q = 0; q < (horizontal ? info.height : info.width); q++) if ((horizontal ? alpha(p, q) : alpha(q, p)) > 160) sum++;
      const score = sum + Math.abs(p - expected) * 0.03;
      if (score < minimum) { best = p; minimum = score; }
    }
    result.push(best);
  }
  result.push(length); return result;
}
const xs = divisions(info.width, cols, true), ys = divisions(info.height, rows, false);
const frames = [];
for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
  let left = xs[col + 1], right = xs[col], top = ys[row + 1], bottom = ys[row];
  for (let y = ys[row]; y < ys[row + 1]; y++) for (let x = xs[col]; x < xs[col + 1]; x++) if (alpha(x, y) > 160) {
    left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
  }
  left = Math.max(xs[col], left - 2); top = Math.max(ys[row], top - 2);
  right = Math.min(xs[col + 1] - 1, right + 2); bottom = Math.min(ys[row + 1] - 1, bottom + 2);
  frames.push({ row, col, left, top, width: right - left + 1, height: bottom - top + 1 });
}
const ratio = Math.min(110 / Math.max(...frames.map(f => f.height)), 110 / Math.max(...frames.map(f => f.width)));
const composites = [];
for (const frame of frames) {
  const width = Math.round(frame.width * ratio), height = Math.round(frame.height * ratio);
  const input = await sharp(source).extract({ left: frame.left, top: frame.top, width: frame.width, height: frame.height }).resize(width, height).png().toBuffer();
  composites.push({ input, left: frame.col * cell + Math.round((cell - width) / 2), top: frame.row * cell + 117 - height });
}
await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: '#00000000' } })
  .composite(composites).webp({ quality: 91, alphaQuality: 100 }).toFile(destination);
console.log({ destination, columns: xs, rows: ys, frames: frames.length });
