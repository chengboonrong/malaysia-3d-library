// npm run import -- <kl-rush checkout>: writes models/<slug>/<viewer.file> for every model whose source.repo is "kl-rush",
// from the checkout's public/content/ or, for builders, its code. The checkout must be at source.commit, and is only read.
//   source.file  copied
//   source.car   assembled: the car's body-lod0.glb plus one wheel node per rig.json wheel, sharing wheel-lod0.glb's mesh,
//                with the game's paint (source.paint), trim, chrome, glass and lamp looks as glTF materials
//   source.builder  built in Chromium: "<file under the checkout>#<export>" is called with no arguments, set to day and saved
//                with three's GLTFExporter (plain materials, PNG textures of at most 1024 px). The page is bundled by the
//                checkout's own Vite and three in a temp dir, so nothing is written to the checkout. Then glow is turned off,
//                source.scale (if any) scales it uniformly and the geometry is meshopt-compressed.
// Every extras block is stripped: some KL Rush cars carry real car model names there. The game's compression stays:
// meshopt geometry is decoded and re-encoded, KTX2 images pass through byte for byte, quantized attributes stay quantized.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Logger, NodeIO, TextureInfo } from '@gltf-transform/core';
import { ALL_EXTENSIONS, KHRMaterialsClearcoat, KHRMeshQuantization, KHRTextureBasisu } from '@gltf-transform/extensions';
import { mergeDocuments, meshopt, prune, unpartition } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

if (!process.argv[2]) throw new Error('usage: npm run import -- <kl-rush checkout>');
const checkout = realpathSync(process.argv[2]); // the path Vite resolves the builders' imports to
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

// The page: every builder module, three's GLTFExporter, and exportBuilder("<file>#<export>") returning the GLB as base64.
// The builders use three's node materials, which GLTFExporter reads only in part (no metalness or roughness), so each becomes
// the plain material it stands for, without its emissive: the export is the daytime look.
const page = (three, files) => `
import { MeshBasicMaterial, MeshStandardMaterial } from '${three}/build/three.webgpu.js';
import { GLTFExporter } from '${three}/examples/jsm/exporters/GLTFExporter.js';
${files.map((f, i) => `import * as m${i} from '${checkout}/${f}';`).join('\n')}
const modules = { ${files.map((f, i) => `'${f}': m${i}`).join(', ')} };
const pick = (m, keys) => Object.fromEntries(keys.filter((k) => m[k] !== undefined).map((k) => [k, m[k]]));
const BASE = ['name', 'color', 'map', 'alphaMap', 'transparent', 'opacity', 'alphaTest', 'side', 'vertexColors'];
const SURFACE = ['normalMap', 'normalScale', 'aoMap', 'aoMapIntensity'];
function plain(m) {
  const lost = Object.keys(m).filter((k) => (k.endsWith('Node') && k !== 'emissiveNode') || ['bumpMap', 'displacementMap', 'lightMap', 'envMap', 'specularMap'].includes(k)).filter((k) => m[k]);
  if (lost.length) throw new Error(\`material \${m.name}: \${lost.join(', ')} cannot be exported\`);
  if (m.isMeshBasicNodeMaterial) return new MeshBasicMaterial(pick(m, BASE));
  if (m.isMeshStandardNodeMaterial) return new MeshStandardMaterial({ ...pick(m, [...BASE, ...SURFACE, 'roughnessMap', 'metalnessMap']), roughness: m.roughness, metalness: m.metalness });
  if (m.isMeshLambertNodeMaterial) return new MeshStandardMaterial({ ...pick(m, [...BASE, ...SURFACE]), roughness: 1, metalness: 0 });
  throw new Error(\`material \${m.name}: unexpected \${m.type}\`);
}
window.exportBuilder = async (builder) => {
  const [file, name] = builder.split('#');
  if (typeof modules[file]?.[name] !== 'function') throw new Error(\`\${builder} is not an exported function\`);
  const built = modules[file][name]();
  built.setNight(0);
  built.object.traverse((o) => {
    if (o.isInstancedMesh || o.isBatchedMesh || o.isSkinnedMesh || o.isLight || o.isPoints || o.isLine || o.isSprite) throw new Error(\`\${builder}: \${o.type} is not handled\`);
    if (!o.material) return;
    const colours = [o.material].flat().map((m) => Boolean(m.vertexColors));
    if (o.geometry.attributes.color && !colours.some(Boolean)) { o.geometry = o.geometry.clone(); o.geometry.deleteAttribute('color'); } // glTF always applies COLOR_0
    else if (o.geometry.attributes.color && !colours.every(Boolean)) throw new Error(\`\${builder}: a mesh mixes vertex-coloured and plain materials\`);
    o.material = Array.isArray(o.material) ? o.material.map(plain) : plain(o.material);
  });
  const glb = await new GLTFExporter().parseAsync(built.object, { binary: true, maxTextureSize: 1024 });
  const url = await new Promise((done) => { const r = new FileReader(); r.onload = () => done(r.result); r.readAsDataURL(new Blob([glb])); });
  return url.slice(url.indexOf(',') + 1);
};
`;

async function exportBuilders(list) {
  const glbs = new Map();
  if (!list.length) return glbs;
  const tmp = realpathSync(mkdtempSync(join(tmpdir(), 'm3d-builders-')));
  let server, browser;
  try {
    writeFileSync(`${tmp}/index.html`, '<!doctype html><script type="module" src="./main.js"></script>');
    writeFileSync(`${tmp}/main.js`, page(`${checkout}/node_modules/three`, [...new Set(list.map((m) => m.source.builder.split('#')[0]))]));
    const { build } = await import(pathToFileURL(`${checkout}/node_modules/vite/dist/node/index.js`));
    await build({ configFile: false, root: tmp, cacheDir: `${tmp}/cache`, envDir: tmp, publicDir: false, logLevel: 'warn',
      build: { outDir: `${tmp}/dist`, minify: false, modulePreload: false, reportCompressedSize: false } });
    server = await serve(`${tmp}/dist`);
    browser = await chromium.launch();
    for (const m of list) {
      // the same bytes every run: a fresh page each, a fixed clock (the Sultan Abdul Samad's hands read it) and a seeded Math.random
      const context = await browser.newContext({ timezoneId: 'Asia/Kuala_Lumpur' });
      await context.clock.setFixedTime(new Date('2026-01-01T10:10:00+08:00'));
      await context.addInitScript(() => {
        let a = 1;
        Math.random = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      });
      const tab = await context.newPage();
      await tab.goto(server.url);
      await tab.waitForFunction(() => window.exportBuilder);
      glbs.set(m.slug, Buffer.from(await tab.evaluate((builder) => window.exportBuilder(builder), m.source.builder), 'base64'));
      await context.close();
    }
  } finally {
    await browser?.close();
    await server?.close();
    rmSync(tmp, { recursive: true, force: true });
  }
  return glbs;
}

async function landmark({ builder, scale }, glb) {
  if (scale !== undefined && !(scale > 0)) throw new Error(`${builder}: source.scale must be a positive number`);
  const doc = await io.readBinary(glb);
  doc.setLogger(new Logger(Logger.Verbosity.ERROR)); // quantize warns about every tiling UV set, which it leaves as floats
  const root = doc.getRoot();
  for (const mat of root.listMaterials()) mat.setEmissiveFactor([0, 0, 0]).setEmissiveTexture(null); // daytime: no window or lamp glow
  for (const p of [...root.listScenes(), ...root.listNodes(), ...root.listMeshes(), ...root.listMaterials(), ...root.listTextures()]) if (/kl.?rush/i.test(p.getName())) p.setName('');
  if (scale) for (const n of root.listScenes()[0].listChildren()) n.setTranslation(n.getTranslation().map((v) => v * scale)).setScale(n.getScale().map((v) => v * scale));
  await doc.transform(prune(), meshopt({ encoder: MeshoptEncoder }));
  return { doc, sources: [`${checkout}/${builder}`] };
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
const built = await exportBuilders(models.filter((m) => m.source.builder));
for (const m of models) {
  const { doc, sources } = m.source.builder ? await landmark(m.source, built.get(m.slug)) : m.source.car ? await car(m.source) : { doc: await io.read(`${content}/${m.source.file}`), sources: [`${content}/${m.source.file}`] };
  const removed = stripExtras(doc);
  // The game's car bodies and wheels store byte normals without declaring KHR_mesh_quantization. three.js reads them anyway; glTF needs it declared.
  if (doc.getRoot().listMeshes().flatMap((mesh) => mesh.listPrimitives()).some((p) => ['POSITION', 'NORMAL', 'TANGENT'].some((k) => p.getAttribute(k) && p.getAttribute(k).getComponentType() !== 5126))) {
    doc.createExtension(KHRMeshQuantization).setRequired(true);
  }
  const out = `models/${m.slug}/${m.viewer.file}`, bytes = await io.writeBinary(doc);
  writeFileSync(out, bytes);
  console.log(`${m.slug} | ${sources.map((f) => `${f.slice(checkout.length).replace(/^\//, '')} (${sha(f.replace(/#.*/, ''))})`).join(', ')} | ${bytes.length.toLocaleString('en-US')} | ${removed ? 'yes' : 'no'}`);
}
