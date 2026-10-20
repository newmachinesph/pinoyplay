import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, weld, simplify, prune, textureCompress, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import { stat } from 'node:fs/promises';

await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const document = await io.read('artifacts/jeepney-original.glb');
const primitive = document.getRoot().listMeshes()[0].listPrimitives()[0];
const positions = primitive.getAttribute('POSITION');
const ends = { negativeX: { top: -Infinity, count: 0 }, positiveX: { top: -Infinity, count: 0 } };
for (let i = 0; i < positions.getCount(); i++) {
  const p = positions.getElement(i, []);
  const end = p[0] < -0.4 ? ends.negativeX : p[0] > 0.4 ? ends.positiveX : null;
  if (end) { end.top = Math.max(end.top, p[1]); end.count++; }
}
console.log('Independent front cue (hood end is lower):', ends);
await document.transform(
  dedup(), weld(),
  simplify({
    simplifier: { ...MeshoptSimplifier, simplify: (...args) => {
      args[5] = [...(args[5] ?? []), 'Permissive'];
      return MeshoptSimplifier.simplify(...args);
    } },
    ratio: 0.035, error: 0.01,
  }),
  prune(),
  textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 85 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
// Historical generated-model experiment. The game now uses jeepney.ts.
await io.write('artifacts/jeepney-optimized.glb', document);
const triangles = document.getRoot().listMeshes().reduce((n, m) => n + m.listPrimitives().reduce((p, a) => p + (a.getIndices()?.getCount() ?? 0) / 3, 0), 0);
console.log({ triangles, bytes: (await stat('artifacts/jeepney-optimized.glb')).size });
