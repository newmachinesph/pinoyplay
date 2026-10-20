// Web-ready TRELLIS.2 props: origin at bottom centre, front toward +Z, height 1,
// decimated to a per-asset triangle budget, WebP textures and meshopt compression.
// Usage: node scripts/optimize-props.mjs <raw glb dir> [public/models]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, prune, textureCompress, meshopt, flatten, getBounds, transformMesh } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { readdir, stat, mkdir } from 'node:fs/promises';
import { join, basename } from 'node:path';

/** triangles: budget after decimation; texture: max edge in px; yaw: degrees to turn the front toward +Z. */
const PROPS = {
  'sari-sari-store': { triangles: 9000, texture: 1024, yaw: 0 },
  'karinderya': { triangles: 9000, texture: 1024, yaw: 0 },
  'panaderia': { triangles: 9000, texture: 1024, yaw: 0 },
  'two-storey-house': { triangles: 9000, texture: 1024, yaw: 0 },
  'coconut-palm': { triangles: 6000, texture: 512, yaw: 0 },
  'mango-tree': { triangles: 7000, texture: 512, yaw: 0 },
  'banana-plants': { triangles: 5000, texture: 512, yaw: 0 },
  'bougainvillea-planter': { triangles: 4000, texture: 512, yaw: 0 },
  'nipa-hut-stilts': { triangles: 6000, texture: 512, yaw: 0 },
  'bangka': { triangles: 8000, texture: 1024, yaw: 19 },
  'apartment': { triangles: 9000, texture: 1024, yaw: 0 },
  'vulcanizing': { triangles: 8000, texture: 1024, yaw: 0 },
  'botika': { triangles: 8000, texture: 1024, yaw: -90 },
  'fruit-stall': { triangles: 8000, texture: 1024, yaw: 0 },
  'karst-islet': { triangles: 7000, texture: 512, yaw: 0 },
  'sea-stacks': { triangles: 5000, texture: 512, yaw: 0 },
  'palm-islet': { triangles: 6000, texture: 512, yaw: 0 },
  'fishball-cart': { triangles: 4000, texture: 512, yaw: 0 },
  'monobloc-set': { triangles: 3000, texture: 512, yaw: 0 },
  'water-drums': { triangles: 3000, texture: 512, yaw: 0 },
  'waiting-shed': { triangles: 3000, texture: 512, yaw: 0 },
};
const DEFAULTS = { triangles: 5000, texture: 512, yaw: 0 };

const triangles = doc => doc.getRoot().listMeshes().reduce((n, mesh) =>
  n + mesh.listPrimitives().reduce((p, prim) => p + (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3, 0), 0);

async function optimize(io, file, outDir) {
  const name = basename(file, '.glb');
  const cfg = { ...DEFAULTS, ...PROPS[name] };
  const doc = await io.read(file);
  await doc.transform(flatten());
  // Bake node transforms into vertices so every asset shares one convention.
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh) transformMesh(mesh, node.getWorldMatrix());
    node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
  }
  const yaw = cfg.yaw * Math.PI / 180, c = Math.cos(yaw), s = Math.sin(yaw);
  for (const mesh of doc.getRoot().listMeshes()) transformMesh(mesh, [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]);
  const { min, max } = getBounds(doc.getRoot().listScenes()[0]);
  const k = 1 / (max[1] - min[1]), tx = -(min[0] + max[0]) / 2, tz = -(min[2] + max[2]) / 2;
  for (const mesh of doc.getRoot().listMeshes())
    transformMesh(mesh, [k, 0, 0, 0, 0, k, 0, 0, 0, 0, k, 0, k * tx, -k * min[1], k * tz, 1]);
  // Base colour carries the painted detail; a flat rough, non-metal surface keeps phones fast.
  for (const material of doc.getRoot().listMaterials())
    material.setMetallicRoughnessTexture(null).setMetallicFactor(0).setRoughnessFactor(.85);
  const before = triangles(doc);
  await doc.transform(
    dedup(), weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, cfg.triangles / before), error: 0.01 }),
    prune(),
    textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [cfg.texture, cfg.texture], quality: 76 }),
    meshopt({ encoder: MeshoptEncoder, level: 'high' }),
  );
  const out = join(outDir, `${name}.glb`);
  await io.write(out, doc);
  const size = { x: (max[0] - min[0]) * k, z: (max[2] - min[2]) * k };
  console.log(`${name}: ${before} -> ${triangles(doc)} tris, ${((await stat(out)).size / 1024).toFixed(0)} KiB, footprint ${size.x.toFixed(2)} x ${size.z.toFixed(2)} per unit height`);
}

const [src, outDir = 'public/models'] = process.argv.slice(2);
if (!src) throw new Error('Usage: node scripts/optimize-props.mjs <raw glb dir> [out dir]');
await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
await mkdir(outDir, { recursive: true });
for (const file of (await readdir(src)).filter(f => f.endsWith('.glb')).sort())
  await optimize(io, join(src, file), outDir);
