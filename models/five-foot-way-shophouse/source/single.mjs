// node single.mjs <module.glb> <column.glb> <out.glb>
// One standalone shophouse: the row module plus its two end columns where the game puts them on a one-unit row
// (x = ±(5.6/2 - 0.25) = ±2.55, z 7.7). Textures pass through byte for byte.
import { NodeIO } from '@gltf-transform/core';
import { mergeDocuments, unpartition, prune } from '@gltf-transform/functions';
const [modulePath, columnPath, out] = process.argv.slice(2);
const io = new NodeIO(), doc = await io.read(modulePath), column = await io.read(columnPath);
const scene = doc.getRoot().listScenes()[0];
const map = mergeDocuments(doc, column);
const columnScene = map.get(column.getRoot().listScenes()[0]);
const mesh = columnScene.listChildren()[0].getMesh();
for (const [side, x] of [['left', -2.55], ['right', 2.55]]) scene.addChild(doc.createNode(`Arcade_column_${side}`).setMesh(mesh).setTranslation([x, 0, 7.7]));
for (const node of columnScene.listChildren()) node.dispose();
columnScene.dispose();
doc.getRoot().setDefaultScene(scene);
await doc.transform(prune(), unpartition());
await io.write(out, doc);
console.log('wrote', out);
