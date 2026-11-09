// npm run build: checks every models/*/model.json and writes the site to dist/. Exit code 1 on any failed gate.
// Triangles, bytes and dimensions on the pages are read from the files here, never typed into model.json.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import validator from 'gltf-validator';
import { zipSync } from 'fflate';
import { MeshoptDecoder } from 'meshoptimizer';
import { seamCheck } from './seam-check.mjs';
import { homePage, layout, mb, modelPage } from './pages.mjs';
import { unpack } from './unpack.mjs';

const site = JSON.parse(readFileSync('site.json', 'utf8'));
const models = readdirSync('models').filter((slug) => existsSync(`models/${slug}/model.json`))
  .map((slug) => ({ slug, ...JSON.parse(readFileSync(`models/${slug}/model.json`, 'utf8')) }));
const errors = [];
const stop = (title) => {
  if (!errors.length) return;
  console.error(`${title}:\n  ${errors.join('\n  ')}`);
  process.exit(1);
};

for (const m of models) {
  const missing = ['id', 'name', 'category', 'tags', 'summary', 'notes', 'licence'].filter((k) => m[k] === undefined);
  if (m.localName !== undefined && (!m.localName?.lang || !m.localName?.text)) missing.push('localName.lang/text');
  if (!m.viewer?.file || !m.viewer?.cameraOrbit) missing.push('viewer.file/cameraOrbit');
  if (!Array.isArray(m.downloads) || m.downloads.some((d) => !d.label || !d.file)) missing.push('downloads[].label/file');
  if (!Array.isArray(m.credits) || m.credits.some((c) => !c.part || !c.by || c.licence === undefined || typeof c.verified !== 'boolean')) missing.push('credits[].part/by/licence/verified');
  if (missing.length) errors.push(`${m.slug}: model.json is missing ${missing.join(', ')}`);
  if (!['review', 'approved'].includes(m.status)) errors.push(`${m.slug}: status must be "review" or "approved"`);
}
stop('model.json errors');
models.sort((a, b) => a.id.localeCompare(b.id));

// Every model stands at exactly one exit (site.json), in the order the exit lists them.
const bySlug = new Map(models.map((m) => [m.slug, m]));
for (const e of site.exits) {
  e.members = e.models.map((slug) => bySlug.get(slug) ?? errors.push(`site.json exit "${e.id}": no model "${slug}"`)).filter((m) => typeof m === 'object');
  for (const m of e.members) m.exit ? errors.push(`${m.slug}: at exits "${m.exit.id}" and "${e.id}"`) : m.exit = e;
}
for (const m of models) if (!m.exit) errors.push(`${m.slug}: at no exit in site.json`);
for (const b of site.billboards ?? []) {
  if (!site.exits.some((e) => e.id === b.after)) errors.push(`site.json billboard ${b.image}: no exit "${b.after}"`);
  if (!existsSync(`site/kl-rush/${b.image}`)) errors.push(`site.json billboard: no site/kl-rush/${b.image}`);
}
stop('site.json exit errors');

for (const m of models) {
  m.poster = existsSync(`models/${m.slug}/poster.webp`);
  if (site.public) {
    if (m.status !== 'approved') errors.push(`${m.slug}: status is "${m.status}", not "approved"`);
    if (m.licence === null) errors.push(`${m.slug}: licence is pending (null)`);
    for (const c of m.credits) if (!c.verified) errors.push(`${m.slug}: credit "${c.part}" by ${c.by} is not verified`);
    if (!m.poster) errors.push(`${m.slug}: no poster.webp (npm run posters)`);
  } else if (!m.poster) console.warn(`warning: ${m.slug}: no poster.webp yet (npm run posters)`);
}
stop('site.json has "public": true, so the build refuses to run');

// Downloads must open anywhere, so no compression. A view-only file may be compressed the way the game ships it (meshopt,
// quantization, KTX2: decoders are vendored), but not Draco, whose decoder would come from a CDN.
const COMPRESSION = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_meshopt_compression', 'KHR_texture_basisu'];
async function validate(file, download) {
  const { issues, info } = await validator.validateBytes(new Uint8Array(readFileSync(file)));
  console.log(`validator ${file}: ${issues.numErrors} errors, ${issues.numWarnings} warnings, ${issues.numInfos} infos, ${issues.numHints} hints`);
  if (issues.numErrors) errors.push(`${file}: ${issues.numErrors} validator errors (${issues.messages.filter((i) => i.severity === 0).slice(0, 3).map((i) => `${i.code} ${i.pointer ?? ''}`).join('; ')})`);
  const refused = (info?.extensionsUsed ?? []).filter((e) => download ? COMPRESSION.includes(e) : e === 'KHR_draco_mesh_compression');
  if (refused.length) errors.push(`${file}: uses ${refused.join(', ')}; ${download ? 'downloads must open without decoders' : 'no Draco decoder is vendored'}`);
}

// Triangles drawn by the default scene: a mesh used by two nodes counts twice. KTX2 textures are read but not decoded.
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
async function stats(file) {
  const root = (await io.read(file)).getRoot(), scene = root.getDefaultScene() ?? root.listScenes()[0];
  let triangles = 0;
  scene.traverse((node) => {
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      const n = (prim.getIndices() ?? prim.getAttribute('POSITION')).getCount(), mode = prim.getMode();
      triangles += mode === 4 ? n / 3 : mode === 5 || mode === 6 ? n - 2 : 0;
    }
  });
  // getBounds ignores skins, and a skinned mesh is drawn where its joints put it, so bound every vertex where it is drawn at rest
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const mul = (a, b) => a.map((_, k) => [0, 1, 2, 3].reduce((sum, i) => sum + a[i * 4 + k % 4] * b[k - k % 4 + i], 0)); // column-major a × b
  scene.traverse((node) => {
    const skin = node.getSkin(), ibm = skin?.getInverseBindMatrices(), world = node.getWorldMatrix();
    const joints = skin?.listJoints().map((j, i) => mul(j.getWorldMatrix(), ibm ? ibm.getElement(i, []) : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
    for (const prim of node.getMesh()?.listPrimitives() ?? []) {
      const pos = prim.getAttribute('POSITION'), J = prim.getAttribute('JOINTS_0'), W = prim.getAttribute('WEIGHTS_0');
      for (let v = 0; v < pos.getCount(); v++) {
        const p = pos.getElement(v, []), j = joints && J.getElement(v, []), w = joints && W.getElement(v, []);
        const m = joints ? joints[0].map((_, k) => w.reduce((sum, wk, i) => sum + wk * joints[j[i]][k], 0)) : world;
        for (let a = 0; a < 3; a++) {
          const x = m[a] * p[0] + m[4 + a] * p[1] + m[8 + a] * p[2] + m[12 + a];
          min[a] = Math.min(min[a], x); max[a] = Math.max(max[a], x);
        }
      }
    }
  });
  return { triangles, bytes: statSync(file).size, size: max.map((v, i) => v - min[i]) };
}

// Sorted entries and one fixed mtime, so the same folder always zips to the same bytes. fflate stores local DOS time,
// so the date is built from local fields and the bytes don't depend on the machine's time zone. Dotfiles are skipped.
const MTIME = new Date(2000, 0, 1);
const kitFiles = (dir) => readdirSync(dir, { recursive: true }).filter((f) => !/(^|\/)\./.test(f) && statSync(join(dir, f)).isFile()).sort();
const zip = (dir) => zipSync(Object.fromEntries(kitFiles(dir).map((f) => [f, [readFileSync(join(dir, f)), { mtime: MTIME }]])));

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/vendor', { recursive: true });
// The plain (non-module) build bundles three.js and lit. It fetches decoders only for compressed files: meshopt and KTX2
// come from vendor/ (see the page script), Draco is refused above. Its meshopt decoder is bundled too; it only waits for
// the script at meshoptDecoderLocation to load, so any working copy will do.
copyFileSync('node_modules/@google/model-viewer/dist/model-viewer.min.js', 'dist/vendor/model-viewer.min.js');
copyFileSync('node_modules/meshoptimizer/meshopt_decoder.cjs', 'dist/vendor/meshopt_decoder.js');
mkdirSync('dist/vendor/basis');
for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm']) copyFileSync(`node_modules/three/examples/jsm/libs/basis/${f}`, `dist/vendor/basis/${f}`);
for (const f of ['styles.css', 'site.js']) copyFileSync(`site/${f}`, `dist/${f}`);
mkdirSync('dist/kl-rush');
for (const f of readdirSync('site/kl-rush')) copyFileSync(`site/kl-rush/${f}`, `dist/kl-rush/${f}`);
// Overpass (SIL Open Font License 1.1), the road-sign face, self-hosted with its licence
mkdirSync('dist/fonts');
for (const f of ['overpass-latin-wght-normal.woff2', 'overpass-latin-ext-wght-normal.woff2']) copyFileSync(`node_modules/@fontsource-variable/overpass/files/${f}`, `dist/fonts/${f}`);
copyFileSync('node_modules/@fontsource-variable/overpass/LICENSE', 'dist/fonts/OFL.txt');

for (const m of models) {
  const src = `models/${m.slug}`, out = `dist/models/${m.slug}`;
  mkdirSync(out, { recursive: true });
  // the tile file belongs to a kit and is held to the download rules
  const downloadGlbs = [...m.downloads.flatMap((d) => d.from ? kitFiles(`${src}/${d.from}`).map((f) => `${d.from}/${f}`) : d.unpack ? [] : [d.file]), m.tile?.file]
    .filter((f) => f?.endsWith('.glb'));
  for (const f of new Set([m.viewer.file, ...downloadGlbs])) await validate(`${src}/${f}`, downloadGlbs.includes(f));

  const s = m.stats = await stats(`${src}/${m.viewer.file}`);
  console.log(`${m.slug}: ${s.triangles.toLocaleString('en-US')} triangles, ${s.bytes.toLocaleString('en-US')} B, ${s.size.map((v) => v.toFixed(2)).join(' × ')} m`);

  if (m.tile && !(await seamCheck(`${src}/${m.tile.file}`, m.tile.width))) errors.push(`${m.slug}: ${m.tile.file} fails the tile check`);

  for (const f of new Set([m.viewer.file, ...m.downloads.filter((d) => !d.from && !d.unpack).map((d) => d.file), ...(m.poster ? ['poster.webp'] : [])])) {
    mkdirSync(dirname(`${out}/${f}`), { recursive: true });
    copyFileSync(`${src}/${f}`, `${out}/${f}`);
  }
  for (const d of m.downloads.filter((d) => d.from)) writeFileSync(`${out}/${d.file}`, zip(`${src}/${d.from}`));
  // "unpack": the download is the viewer file, decoded so any glTF tool opens it, with the credit and licence inside
  for (const d of m.downloads.filter((d) => d.unpack)) {
    if (!m.licence) { errors.push(`${m.slug}: download ${d.file} has no licence to carry`); continue; }
    mkdirSync(dirname(`${out}/${d.file}`), { recursive: true });
    writeFileSync(`${out}/${d.file}`, await unpack(io, `${src}/${m.viewer.file}`, `${site.name}, ${m.licence}`));
    await validate(`${out}/${d.file}`, true);
  }

  m.links = m.downloads.map((d) => ({ href: d.file, name: d.file.split('/').pop(), label: d.label, size: mb(statSync(`${out}/${d.file}`).size) }));
}

// Nearby: the next three objects at the same exit (straight on), then the first object at the next exit (take the exit).
const nearby = (m) => {
  const own = m.exit.members, i = own.indexOf(m), next = site.exits[(site.exits.indexOf(m.exit) + 1) % site.exits.length];
  return [...[1, 2, 3].map((k) => own[(i + k) % own.length]).filter((n, k, all) => n !== m && all.indexOf(n) === k).map((n) => ({ m: n, dir: 'up' })),
    { m: next.members[0], dir: 'up-left' }];
};
const page = (root, m) => ({ site, root, exits: site.exits, stones: models, current: m?.exit.id, viewer: true });
for (const m of models) writeFileSync(`dist/models/${m.slug}/index.html`, layout({ ...page('../../', m), title: `${m.name} · ${site.name}`,
  description: m.summary, bodyClass: `model-page exit-${m.exit.id}`, main: modelPage({ site, m, nearby: nearby(m) }) }));
writeFileSync('dist/index.html', layout({ ...page('./'), current: site.exits[0].id, title: `${site.name}: real objects from Malaysia in 3D`,
  description: 'Real objects from Malaysia in 3D: Kuala Lumpur landmarks, the cars on our roads, kopitiam and night-market food, and the kampung.',
  bodyClass: 'home', main: homePage({ site, exits: site.exits, models }) }));
if (!site.public) writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');

stop('build failed');
console.log(`built dist/: ${models.length} model${models.length === 1 ? '' : 's'}, ${site.public ? 'public' : 'private (noindex, robots.txt disallows all)'}`);
