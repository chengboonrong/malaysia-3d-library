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
  if (!Array.isArray(m.credits) || m.credits.some((c) => !c.part || !c.by || !c.url || c.licence === undefined || typeof c.verified !== 'boolean')) missing.push('credits[].part/by/url/licence/verified');
  if (missing.length) errors.push(`${m.slug}: model.json is missing ${missing.join(', ')}`);
  if (!['review', 'approved'].includes(m.status)) errors.push(`${m.slug}: status must be "review" or "approved"`);
}
stop('model.json errors');
models.sort((a, b) => a.id.localeCompare(b.id));

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

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const metres = (v) => v < 1 ? v.toPrecision(2) : v.toFixed(1);
const mb = (bytes) => bytes < 1e6 ? `${Math.ceil(bytes / 1e3)} KB` : `${(bytes / 1e6).toFixed(1)} MB`;

const page = (root, title, description, main) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${site.public ? '' : '\n  <meta name="robots" content="noindex">'}
  <meta name="description" content="${esc(description)}">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="${root}styles.css">
</head>
<body>
  <header class="shell topbar">
    <a class="wordmark" href="${root}" aria-label="${esc(site.name)} home">
      <svg class="mark" viewBox="0 0 40 40" aria-hidden="true"><path d="M8 32V15l12-7 12 7v17H8Zm0-17 12 7 12-7M20 22v10M12 26h4m8 0h4" /></svg>
      <span>Malaysia <b>3D Library</b></span>
    </a>
    <nav aria-label="Main navigation"><a href="${root}#collection">Collection</a><a href="${root}#about">About</a></nav>
    <span class="edition"><i></i> Founding preview</span>
  </header>
${main}
  <footer class="shell footer"><span>${esc(site.name)}</span><span>Founding collection · ${[...new Set(models.map((m) => esc(m.category)))].join(' · ')}</span></footer>
</body>
</html>
`;

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist/vendor', { recursive: true });
// The plain (non-module) build bundles three.js and lit. It fetches decoders only for compressed files: meshopt and KTX2
// come from vendor/ (see the page script), Draco is refused above. Its meshopt decoder is bundled too; it only waits for
// the script at meshoptDecoderLocation to load, so any working copy will do.
copyFileSync('node_modules/@google/model-viewer/dist/model-viewer.min.js', 'dist/vendor/model-viewer.min.js');
copyFileSync('node_modules/meshoptimizer/meshopt_decoder.cjs', 'dist/vendor/meshopt_decoder.js');
mkdirSync('dist/vendor/basis');
for (const f of ['basis_transcoder.js', 'basis_transcoder.wasm']) copyFileSync(`node_modules/three/examples/jsm/libs/basis/${f}`, `dist/vendor/basis/${f}`);
copyFileSync('site/styles.css', 'dist/styles.css');

for (const m of models) {
  const src = `models/${m.slug}`, out = `dist/models/${m.slug}`;
  mkdirSync(out, { recursive: true });
  // the tile file belongs to a kit and is held to the download rules
  const downloadGlbs = [...m.downloads.flatMap((d) => d.from ? kitFiles(`${src}/${d.from}`).map((f) => `${d.from}/${f}`) : [d.file]), m.tile?.file]
    .filter((f) => f?.endsWith('.glb'));
  for (const f of new Set([m.viewer.file, ...downloadGlbs])) await validate(`${src}/${f}`, downloadGlbs.includes(f));

  const s = await stats(`${src}/${m.viewer.file}`);
  const scale = s.size.map((v, i) => `${metres(v)}&nbsp;m&nbsp;${'WHD'[i]}`).join(' × ');
  console.log(`${m.slug}: ${s.triangles.toLocaleString('en-US')} triangles, ${s.bytes.toLocaleString('en-US')} B, ${s.size.map(metres).join(' × ')} m`);

  if (m.tile && !(await seamCheck(`${src}/${m.tile.file}`, m.tile.width))) errors.push(`${m.slug}: ${m.tile.file} fails the tile check`);

  for (const f of new Set([m.viewer.file, ...m.downloads.filter((d) => !d.from).map((d) => d.file), ...(m.poster ? ['poster.webp'] : [])])) {
    mkdirSync(dirname(`${out}/${f}`), { recursive: true });
    copyFileSync(`${src}/${f}`, `${out}/${f}`);
  }
  for (const d of m.downloads.filter((d) => d.from)) writeFileSync(`${out}/${d.file}`, zip(`${src}/${d.from}`));

  const links = m.downloads.map((d, i) => `<a class="button ${i ? 'secondary' : 'primary'}" href="${esc(d.file)}" download="${esc(d.file.split('/').pop())}">${esc(d.label)}, ${mb(statSync(`${out}/${d.file}`).size)} <span aria-hidden="true">↓</span></a>`);
  const credits = m.credits.map((c) => `<li><b>${esc(c.part)}:</b> <a href="${esc(c.url)}">${esc(c.by)}</a> · ${c.licence ? esc(c.licence) : 'licence pending'}${c.verified ? '' : ' (not verified)'}${c.note ? ` · ${esc(c.note)}` : ''}</li>`);
  writeFileSync(`${out}/index.html`, page('../../', `${m.name} · ${site.name}`, m.summary, `  <main class="shell">
    <section class="collection" aria-labelledby="title">
      <p class="eyebrow"><span>${esc(m.id)}</span> / ${esc(m.category)}</p>
      <h1 id="title">${esc(m.name)}</h1>${m.localName ? `
      <p class="subtitle" lang="${esc(m.localName.lang)}">${esc(m.localName.text)}</p>` : ''}
      <figure class="stage">
        <model-viewer src="${esc(m.viewer.file)}"${m.poster ? ' poster="poster.webp"' : ''} alt="${esc(m.name)}, interactive 3D model" camera-controls touch-action="pan-y" camera-orbit="${esc(m.viewer.cameraOrbit)}" interaction-prompt="none"></model-viewer>
        <div class="stage-top"><span><i></i> Model preview</span><span>${esc(m.id)}</span></div>
        <figcaption class="stage-bottom">
          <span>Drag to rotate · Scroll or pinch to zoom</span>
          <div class="view-actions" role="group" aria-label="Camera views">
            <button type="button" data-orbit="0deg 80deg auto">Front</button>
            <button type="button" data-orbit="${esc(m.viewer.cameraOrbit)}">Reset</button>
          </div>
        </figcaption>
      </figure>
      <script>
        self.ModelViewerElement = { meshoptDecoderLocation: '../../vendor/meshopt_decoder.js', ktx2TranscoderLocation: '../../vendor/basis/' };
        const viewer = document.querySelector('model-viewer');
        // three.js needs WebGL 2. Without it model-viewer still loads the model, can't draw it, and hides the poster.
        if (!document.createElement('canvas').getContext('webgl2')) {
          viewer.removeAttribute('src');
          document.querySelector('.stage-bottom').remove();
        }
        for (const button of document.querySelectorAll('[data-orbit]')) button.addEventListener('click', () => {
          viewer.cameraOrbit = button.dataset.orbit;
          viewer.cameraTarget = 'auto auto auto';
          viewer.fieldOfView = 'auto';
        });
      </script>
      <div class="asset-info">
        <div>
          <p class="asset-description">${esc(m.summary)}</p>
          <ul class="tags">${m.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        </div>
        <dl class="specs">
          <div><dt>Format</dt><dd>GLB 2.0</dd></div>
          <div><dt>Triangles</dt><dd>${s.triangles.toLocaleString('en-US')}</dd></div>
          <div><dt>Size</dt><dd>${mb(s.bytes)}</dd></div>
          <div><dt>Scale</dt><dd>${scale}</dd></div>
        </dl>
        <div class="download">
          ${links.join('\n          ')}
          <p>${!links.length ? 'Downloads open once this model’s origin and reuse terms are cleared.' : m.licence ? `Licence: ${esc(m.licence)}.` : 'Review copy. Public reuse terms are pending.'}</p>
        </div>
      </div>
      <details class="asset-notes">
        <summary>Model notes and credits</summary>
        <div>
          ${m.notes.map((n) => `<p>${esc(n)}</p>`).join('\n          ')}
          <ul>${credits.join('')}</ul>
        </div>
      </details>
    </section>
  </main>
  <script type="module" src="../../vendor/model-viewer.min.js"></script>`));
}

const card = (m) => `<li class="card"><a href="models/${esc(m.slug)}/">
          ${m.poster ? `<img class="thumb" src="models/${esc(m.slug)}/poster.webp" alt="" loading="lazy">` : '<span class="thumb"></span>'}
          <p class="eyebrow"><span>${esc(m.id)}</span></p>
          <h4>${esc(m.name)}</h4>${m.localName ? `
          <p class="subtitle" lang="${esc(m.localName.lang)}">${esc(m.localName.text)}</p>` : ''}${m.status === 'approved' ? '' : '\n          <p class="status">In review</p>'}
        </a></li>`;
// one group per category, in the order categories first appear by id
const groups = [...new Set(models.map((m) => m.category))].map((c) => `<h3 class="category">${esc(c)}</h3>
      <ul class="cards">
        ${models.filter((m) => m.category === c).map(card).join('\n        ')}
      </ul>`);
writeFileSync('dist/index.html', page('./', site.name, 'Original 3D models inspired by everyday Malaysia.', `  <main class="shell">
    <section class="hero" aria-labelledby="title">
      <div class="intro">
        <p class="eyebrow"><span>01</span> / KOLEKSI MALAYSIA</p>
        <h1 id="title">Malaysia<br><em>3D Library</em></h1>
        <p class="tagline">Build a little bit of Malaysia.</p>
        <p class="summary">Original 3D models of everyday Malaysia, from shophouses and hawker food to the cars on our roads. Every model opens in 3D; downloads open as each one is cleared for reuse.</p>
        <a class="button primary" href="#collection">Explore the collection <span aria-hidden="true">↓</span></a>
      </div>
    </section>

    <section id="collection" class="collection" aria-labelledby="collection-title">
      <p class="eyebrow"><span>02</span> / THE COLLECTION</p>
      <h2 id="collection-title">Founding collection</h2>
      ${groups.join('\n      ')}
    </section>

    <section id="about" class="about" aria-labelledby="about-title">
      <p class="eyebrow"><span>03</span> / THE LIBRARY</p>
      <div><h2 id="about-title">A library shaped by Malaysia.</h2><p>The collection begins with original assets created for KL Rush, a browser game inspired by Malaysian streets and everyday life.</p><a href="https://github.com/chengboonrong/kl-rush-preview">Explore KL Rush <span aria-hidden="true">↗</span></a></div>
    </section>
  </main>`));
if (!site.public) writeFileSync('dist/robots.txt', 'User-agent: *\nDisallow: /\n');

stop('build failed');
console.log(`built dist/: ${models.length} model${models.length === 1 ? '' : 's'}, ${site.public ? 'public' : 'private (noindex, robots.txt disallows all)'}`);
