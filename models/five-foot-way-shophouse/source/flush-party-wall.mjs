// node flush-party-wall.mjs <in.glb> <out.glb>
// The fitted left party wall reaches z 8.000 above the arcade ceiling while the upper front panels stop at 7.935, so every
// tiled seam shows a 0.25 m strip 6.5 cm proud. Tuck the wall end 1 cm behind the panel face (not onto it: coplanar faces
// flicker). Only the wall end at z 8.000 in the plaster group: cornice, trim, slab and the z 8.013 band end project on
// both sides and must stay.
import { NodeIO } from '@gltf-transform/core';
const [input, output] = process.argv.slice(2), PANEL = 7.935, TUCK = PANEL - 0.01;
const io = new NodeIO(), doc = await io.read(input);
let moved = 0;
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  if (prim.getMaterial()?.getName() !== 'Plaster_aged_ivory') continue;
  const pos = prim.getAttribute('POSITION'), p = [];
  for (let i = 0; i < pos.getCount(); i++) {
    pos.getElement(i, p);
    if (p[0] < -2.54 && p[1] > 4.0 && p[2] > PANEL + 0.0005 && p[2] < 8.005) { p[2] = TUCK; pos.setElement(i, p); moved++; }
  }
}
if (moved !== 12) throw new Error(`expected the 12 party-wall vertices (4 corners x 3 normals), found ${moved}: the source changed, recheck before shipping`);
await io.write(output, doc);
console.log(`moved ${moved} party-wall vertices to z ${TUCK}; wrote ${output}`);
