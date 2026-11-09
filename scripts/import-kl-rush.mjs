// npm run import -- <kl-rush checkout>: writes models/<slug>/<viewer.file> for every model whose source.repo is "kl-rush",
// from the checkout's public/content/. The checkout must be at source.commit, and is only read.
//   source.file  copied
//   source.car   assembled: the car's body-lod0.glb plus one wheel node per rig.json wheel, sharing wheel-lod0.glb's mesh,
//                with the game's paint (source.paint), trim, chrome, glass and lamp looks as glTF materials
// Every extras block is stripped: some KL Rush cars carry real car model names there. The game's compression stays:
// meshopt geometry is decoded and re-encoded, KTX2 images pass through byte for byte, quantized attributes stay quantized.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { Logger, NodeIO, TextureInfo } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsClearcoat, KHRMeshQuantization, KHRTextureBasisu } from '@gltf-transform/extensions';
import { mergeDocuments, prune, unpartition } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';

const checkout = process.argv[2];
if (!checkout) throw new Error('usage: npm run import -- <kl-rush checkout>');
const head = execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const models = readdirSync('models').filter((slug) => existsSync(`models/${slug}/model.json`))
  .map((slug) => ({ slug, ...JSON.parse(readFileSync(`models/${slug}/model.json`, 'utf8')) }))
  .filter((m) => m.source?.repo === 'kl-rush');
const wrong = models.filter((m) => !m.source.commit || !head.startsWith(m.source.commit));
if (wrong.length) {
  console.error(`${checkout} is at ${head}; these models want another commit:\n  ${wrong.map((m) => `${m.slug}: ${m.source.commit}`).join('\n  ')}`);
  process.exit(1);
}

await Promise.all([MeshoptDecoder.ready, MeshoptEncoder.ready]);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const content = `${checkout}/public/content`;

// Wheels are lathed around X with the outer face at +X, so a wheel on the left (x < 0) turns π about Y, as the game does
// (src/actors/vehicleModels.js:2117: `if (w.side < 0) slot.rotation.y = Math.PI;`).
async function car({ car: type, paint }) {
  if (!/^#[0-9a-f]{6}$/i.test(paint ?? '')) throw new Error(`${type}: source.paint must be an sRGB hex colour like #c8102e`);
  const dir = `${content}/vehicles/${type}`;
  const doc = await io.read(`${dir}/body-lod0.glb`), wheel = await io.read(`${dir}/wheel-lod0.glb`);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  const rig = JSON.parse(readFileSync(`${dir}/rig.json`, 'utf8'));
  const root = doc.getRoot(), scene = root.getDefaultScene() ?? root.listScenes()[0];
  const wheelScene = mergeDocuments(doc, wheel).get(wheel.getRoot().getDefaultScene() ?? wheel.getRoot().listScenes()[0]);
  const mesh = wheelScene.listChildren()[0].getMesh();
  rig.wheels.forEach(([x, y, z], i) => scene.addChild(doc.createNode(`wheel-${i + 1}`).setMesh(mesh).setTranslation([x, y, z]).setRotation(x < 0 ? [0, 1, 0, 0] : [0, 0, 0, 1])));
  for (const node of wheelScene.listChildren()) node.dispose();
  wheelScene.dispose();

  // The game ignores the GLB's materials. It shades each triangle by its _PART with the shared rimba surfaces
  // (src/actors/vehicleSkin.js, nodesFor and makeVehicleSkinMaterials); these are the same looks in plain glTF,
  // without the game's dirt, dust, livery and lamp glow.
  const surfaces = ['color', 'normal', 'orm'].map((k) => [k, `${content}/vehicles/rimba/${k}.ktx2`]);
  doc.createExtension(KHRTextureBasisu).setRequired(true);
  const tex = Object.fromEntries(surfaces.map(([k, f]) => [k, doc.createTexture(k).setImage(readFileSync(f)).setMimeType('image/ktx2')]));
  const linear = (hex) => [1, 3, 5].map((i) => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return Math.round((c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * 1e6) / 1e6; }); // rounded: ** differs in the last bit across Node versions
  const surface = (name, rgb, metalness, roughness) => { // metalness and roughness from the ORM map unless given
    const m = doc.createMaterial(name).setBaseColorFactor([...rgb, 1]).setBaseColorTexture(tex.color)
      .setNormalTexture(tex.normal).setNormalScale(0.3).setOcclusionTexture(tex.orm);
    if (metalness === undefined) m.setMetallicRoughnessTexture(tex.orm);
    else m.setMetallicFactor(metalness).setRoughnessFactor(roughness);
    for (const info of [m.getBaseColorTextureInfo(), m.getNormalTextureInfo(), m.getOcclusionTextureInfo(), m.getMetallicRoughnessTextureInfo()]) {
      info?.setWrapS(TextureInfo.WrapMode.CLAMP_TO_EDGE).setWrapT(TextureInfo.WrapMode.CLAMP_TO_EDGE); // loadTexture(..., { repeat: false })
    }
    return m;
  };
  const materials = {
    paint: surface('paint', linear(paint)).setExtension('KHR_materials_clearcoat',
      doc.createExtension(KHRMaterialsClearcoat).createClearcoat().setClearcoatFactor(0.65).setClearcoatRoughnessFactor(0.12)),
    trim: surface('trim', [1, 1, 1]),
    chrome: surface('chrome', [1, 1, 1], 0.85, 0.24),
    glass: doc.createMaterial('glass').setBaseColorFactor([...linear('#1f2a33'), 0.6]).setAlphaMode('BLEND').setDoubleSided(true)
      .setMetallicFactor(0.05).setRoughnessFactor(0.09), // content-src/art/tokens.json glass.car
    lamp: surface('lamp', [1, 1, 1], 0, 0.3),
  };
  const buffer = root.listBuffers()[0];
  for (const m of root.listMeshes()) for (const prim of m.listPrimitives()) {
    const part = prim.getAttribute('_PART').getArray(), uv = prim.getAttribute('TEXCOORD_0'), index = prim.getIndices().getArray(), groups = {};
    for (let t = 0; t < index.length; t += 3) {
      const [a, b, c] = index.subarray(t, t + 3);
      if (part[a] !== part[b] || part[b] !== part[c]) throw new Error(`${type}: ${m.getName()} triangle ${t / 3} mixes _PART ${part[a]}, ${part[b]}, ${part[c]}`);
      // part 1 is metal where uv.x < 0.25 (per pixel in the game, per triangle centroid here)
      const name = part[a] === 1 ? (uv.getElement(a, [])[0] + uv.getElement(b, [])[0] + uv.getElement(c, [])[0] < 0.75 ? 'chrome' : 'trim') : ['paint', , 'glass', 'lamp'][part[a]];
      if (!materials[name]) throw new Error(`${type}: ${m.getName()} has _PART ${part[a]}`);
      (groups[name] ??= []).push(a, b, c);
    }
    for (const [name, indices] of Object.entries(groups)) {
      const p = prim.clone().setMaterial(materials[name]).setIndices(doc.createAccessor().setArray(new index.constructor(indices)).setBuffer(buffer))
        .setAttribute('_PART', null).setAttribute('_LIGHTID', null);
      if (name === 'glass') p.setAttribute('COLOR_0', null); // the game's glass material doesn't read vertex colours
      m.addPrimitive(p);
    }
    prim.dispose();
  }
  // drops the GLB's own materials, _PART, _LIGHTID and the unused TEXCOORD_1; keeps TEXCOORD_0, COLOR_0 and the KTX2 surfaces
  await doc.transform(prune({ keepSolidTextures: true }), unpartition()); // a GLB holds one buffer
  for (const ext of root.listExtensionsUsed()) if (['KHR_materials_ior', 'KHR_materials_transmission'].includes(ext.extensionName)) ext.dispose(); // the old glass's
  return { doc, sources: [`${dir}/body-lod0.glb`, `${dir}/wheel-lod0.glb`, `${dir}/rig.json`, ...surfaces.map(([, f]) => f)] };
}

function stripExtras(doc) {
  const root = doc.getRoot(), asset = root.getAsset();
  let removed = 'extras' in asset;
  delete asset.extras;
  for (const p of [root, ...root.listScenes(), ...root.listNodes(), ...root.listMeshes(), ...root.listMeshes().flatMap((m) => m.listPrimitives()),
    ...root.listMaterials(), ...root.listTextures(), ...root.listAccessors(), ...root.listBuffers(), ...root.listSkins(), ...root.listAnimations(), ...root.listCameras()]) {
    if (Object.keys(p.getExtras()).length) { p.setExtras({}); removed = true; }
  }
  return removed;
}

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');
console.log(`checkout ${checkout} at ${head}`);
console.log('model | source (SHA-256) | output bytes | extras removed');
for (const m of models) {
  const { doc, sources } = m.source.car ? await car(m.source) : { doc: await io.read(`${content}/${m.source.file}`), sources: [`${content}/${m.source.file}`] };
  const removed = stripExtras(doc);
  // The game's car bodies and wheels store byte normals without declaring KHR_mesh_quantization. three.js reads them anyway; glTF needs it declared.
  if (doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives()).some((p) => ['POSITION', 'NORMAL', 'TANGENT'].some((k) => p.getAttribute(k) && p.getAttribute(k).getComponentType() !== 5126))) {
    doc.createExtension(KHRMeshQuantization).setRequired(true);
  }
  const out = `models/${m.slug}/${m.viewer.file}`, bytes = await io.writeBinary(doc);
  writeFileSync(out, bytes);
  console.log(`${m.slug} | ${sources.map((f) => `${f.slice(checkout.length).replace(/^\//, '')} (${sha(f)})`).join(', ')} | ${bytes.length.toLocaleString('en-US')} | ${removed ? 'yes' : 'no'}`);
}
