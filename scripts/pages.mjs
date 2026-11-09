// Page templates. The site is a drive: each exit in site.json is a place off one road, and every model stands on the verge
// under its own brown attraction sign. A sticky gantry carries the exits; scripts in site/site.js light the one you're in.
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const metres = (v) => v < 1 ? v.toPrecision(2) : v.toFixed(1);
export const mb = (bytes) => bytes < 1e6 ? `${Math.ceil(bytes / 1e3)} KB` : `${(bytes / 1e6).toFixed(1)} MB`;
const local = (l, tag = 'small') => l ? `<${tag} lang="${esc(l.lang)}">${esc(l.text)}</${tag}>` : '';

// Sign pictograms on a 24-unit grid, white on the sign face, one per exit.
const PICTOGRAMS = {
  skyline: '<path d="M11.4 1h1.2v4.2h-1.2zM9.6 5.6h4.8l1.3 15.8H8.3zM5 21.4h14V23H5z"/>',
  city: '<path fill-rule="evenodd" d="M2.5 23V9.5h8V23zm9.5 0V3.5h9.5V23zM4.5 12h1.6v1.6H4.5zm2.8 0h1.6v1.6H7.3zM4.5 15.4h1.6V17H4.5zm2.8 0h1.6V17H7.3zm6.8-9.4h1.6v1.6h-1.6zm2.9 0h1.6v1.6H17zm-2.9 3.5h1.6v1.6h-1.6zm2.9 0h1.6v1.6H17zm-2.9 3.5h1.6v1.6h-1.6zm2.9 0h1.6v1.6H17zm-2.9 3.5h1.6v1.6h-1.6zm2.9 0h1.6v1.6H17z"/>',
  'old-kl': '<path fill-rule="evenodd" d="M11.6 1h.8v2.2h-.8zM12 3.2c0 2-4.2 3.4-4.2 6.6 0 .5.1.9.3 1.3h7.8c.2-.4.3-.8.3-1.3 0-3.2-4.2-4.6-4.2-6.6zM7.4 11.8h9.2v2.4H7.4zM3.5 14.9h17V23h-17zm7 8.1v-4.2a1.5 1.5 0 0 1 3 0V23zm-4.6-5.4h1.8v2.6H5.9zm10.4 0h1.8v2.6h-1.8z"/>',
  road: '<path fill-rule="evenodd" d="M2 18.6V15c0-1.5 1-2.6 2.5-2.9l3-3.6c.5-.6 1.2-1 2-1h5.2c.8 0 1.5.4 2 1l2.8 3.6c1.6.3 2.5 1.4 2.5 2.9v3.6h-1.7a2.9 2.9 0 0 0-5.7 0H9.4a2.9 2.9 0 0 0-5.7 0zm7.3-8.8-2 2.4h4V9.8zm3.6 0v2.4h4.3l-1.9-2.4zM6.6 20.6a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8zm10.8 0a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8z"/>',
  kopitiam: '<path d="M8.3 2.2h1.3c-.9 1.2 1.1 2.2.1 3.6H8.4c1-1.4-1-2.4-.1-3.6zm4 0h1.3c-.9 1.2 1.1 2.2.1 3.6h-1.3c1-1.4-1-2.4-.1-3.6zM4.6 8h12.6v5.4c0 2.8-2.3 5.1-5.1 5.1H9.7c-2.8 0-5.1-2.3-5.1-5.1zm12.6 1.3h1.4a2.8 2.8 0 0 1 0 5.6h-1.8l.3-1.7h1.5a1.1 1.1 0 0 0 0-2.2h-1.4zM2.6 19.8h16.8v1.7H2.6z"/>',
  'night-market': '<path d="M2 7.2 4 3h16l2 4.2a2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0 2.5 2.5 0 0 1-5 0zM3.8 10.2h1.6V23H3.8zm14.8 0h1.6V23h-1.6zM2.6 15h18.8v2.2H2.6z"/>',
  kampung: '<path d="M12 2.5 23 11h-2.7L12 4.7 3.7 11H1zM5 11.2 12 6l7 5.2V16H5zM6 16.8h1.5V23H6zm4.4 0h1.5V23h-1.5zm4.4 0h1.5V23h-1.5zM18.6 16.8l1.4-.5 2.4 6.7-1.4.5z"/>',
};
const pictogram = (exit) => `<svg class="pictogram" viewBox="0 0 24 24" aria-hidden="true">${PICTOGRAMS[exit]}</svg>`;
// A sign arrow, drawn pointing up; CSS turns it.
const arrow = (dir) => `<svg class="arrow arrow-${dir}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.5 22 11.6h-6.4V22.5H8.4V11.6H2z"/></svg>`;
const shield = '<svg class="shield" viewBox="0 0 40 44" aria-hidden="true"><path d="M20 1.5c5 2.3 11 2.3 17.5.4v17.4c0 10.4-7.2 17.3-17.5 22.9C9.7 36.6 2.5 29.7 2.5 19.3V1.9C9 3.8 15 3.8 20 1.5z"/><text x="20" y="27" text-anchor="middle">3D</text></svg>';
// Height-limit and width-limit roundels: red ring, black value, black chevrons where the limit applies.
const roundel = (kind, value) => `<svg class="roundel" viewBox="0 0 100 100" role="img" aria-label="${kind === 'h' ? 'Height' : 'Width'} ${value} metres">
  <circle cx="50" cy="50" r="43.5"/>
  <path d="${kind === 'h' ? 'M39 22h22l-11 8zM39 78h22l-11-8z' : 'M15 40v20l7-10zM85 40v20l-7-10z'}"/>
  <text x="50" y="${kind === 'h' ? 58 : 56}" text-anchor="middle" font-size="${kind === 'h' ? (value.length > 4 ? 21 : 25) : (value.length > 4 ? 15 : 18)}">${value}<tspan font-size="${kind === 'h' ? 15 : 12}"> m</tspan></text>
</svg>`;
const LICENCES = { 'CC BY 4.0': 'https://creativecommons.org/licenses/by/4.0/' };
const stone = (id) => `<span class="stone"><small>MY</small>${esc(id.slice(3))}</span>`;

function gantry(root, exits, current) {
  const boards = exits.map((e, i) => `<li class="exit-${e.id}"><a class="board" href="${root}#${e.id}"${e.id === current ? ' aria-current="location"' : ''}><span class="exit-no">${i + 1}</span><span class="board-name">${esc(e.name)}${local(e.localName)}</span>${arrow('up-left')}</a></li>`);
  return `<header class="gantry">
    <a class="route" href="${root}">${shield}<span>Malaysia<br>3D Library</span></a>
    <nav class="exits" aria-label="Exits"><ol class="track">
      ${boards.join('\n      ')}
    </ol></nav>
    <form class="jump" role="search" hidden>
      <label for="stone-number">Go to stone</label>
      <span class="jump-field"><span aria-hidden="true">MY</span><input id="stone-number" name="stone" inputmode="numeric" enterkeyhint="go" autocomplete="off" maxlength="6" placeholder="035" aria-describedby="jump-result"></span>
      <button type="submit">Go</button>
      <output id="jump-result" role="status"></output>
    </form>
  </header>`;
}

export function layout({ site, root, title, description, exits, current, stones, bodyClass, main, viewer }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">${site.public ? '' : '\n  <meta name="robots" content="noindex">'}
  <meta name="description" content="${esc(description)}">
  <meta name="theme-color" content="#00694a">
  <title>${esc(title)}</title>
  <link rel="preload" href="${root}fonts/overpass-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="${root}styles.css">
  <script>document.documentElement.classList.add('js')</script>
</head>
<body class="${bodyClass}">
  ${gantry(root, exits, current)}
${main}
  <footer class="footer"><span>${esc(site.name)}</span><span>${site.public ? `${stones.length} objects` : 'Private review, not yet public'}</span><a href="${root}fonts/OFL.txt">Type: Overpass, SIL Open Font License</a></footer>
  <script type="application/json" id="stones">${JSON.stringify(Object.fromEntries(stones.map((m) => [m.id.slice(3), `${root}models/${m.slug}/`])))}</script>${viewer ? `
  <script>
    self.ModelViewerElement = { meshoptDecoderLocation: '${root}vendor/meshopt_decoder.js', ktx2TranscoderLocation: '${root}vendor/basis/' };
    // three.js needs WebGL 2. Without it model-viewer still loads the model, can't draw it, and hides the poster.
    if (!document.createElement('canvas').getContext('webgl2')) {
      document.documentElement.classList.add('no-webgl');
      for (const viewer of document.querySelectorAll('model-viewer')) viewer.removeAttribute('src');
    }
  </script>
  <script type="module" src="${root}vendor/model-viewer.min.js"></script>` : ''}
  <script src="${root}site.js" defer></script>
</body>
</html>
`;
}

const attraction = (m, tag = 'b', attrs = '') => `<span class="attraction">${pictogram(m.exit.id)}<span class="attraction-text"><${tag}${attrs} class="attraction-name">${esc(m.name)}</${tag}>${local(m.localName)}</span>${stone(m.id)}</span>`;
const objectLink = (m, root, poster = true) => `<a class="object-link" href="${root}models/${esc(m.slug)}/">
          ${!poster ? '' : m.poster ? `<img src="${root}models/${esc(m.slug)}/poster.webp" alt="" width="1200" height="900" loading="lazy" decoding="async">` : '<span class="no-poster"></span>'}
          ${attraction(m)}${m.links.length ? '\n          <span class="plate plate-open">Download open</span>' : ''}
        </a>`;

const GAME = 'https://kl-rush.vercel.app';
// A roadside billboard for KL Rush, the game these models were made for. Its images carry their own notice (site/kl-rush/NOTICE.md).
const billboard = (b, i) => `    <section class="billboard${i % 2 ? ' billboard-right' : ''}" aria-labelledby="billboard-${i + 1}">
      <div class="billboard-frame">
        <img class="billboard-shot" src="kl-rush/${esc(b.image)}" alt="${esc(b.alt)}" width="1280" height="720" loading="lazy" decoding="async">
        <div class="billboard-copy">
          <img class="billboard-logo" src="kl-rush/logo.webp" alt="KL Rush: Jom Pecut" width="640" height="194" loading="lazy" decoding="async">
          <p class="billboard-head">${esc(b.head)}</p>
          <p>${esc(b.text)}</p>
          <a class="billboard-play" href="${GAME}">Play free in your browser${arrow('right')}</a>
        </div>
        <p class="billboard-plate" id="billboard-${i + 1}">Advertisement · from the makers of this library</p>
      </div>
    </section>`;

export function homePage({ site, exits, models }) {
  const count = (n) => `${n} object${n === 1 ? '' : 's'}`;
  const sections = exits.map((e, i) => {
    const [lead, ...rest] = e.members;
    const live = i === 0 ? `<div class="live">
        <figure class="stage stage-live">
          <model-viewer src="models/${esc(lead.slug)}/${esc(lead.viewer.file)}"${lead.poster ? ` poster="models/${esc(lead.slug)}/poster.webp"` : ''} alt="${esc(lead.name)}, turning in 3D" camera-controls disable-zoom auto-rotate auto-rotate-delay="0" rotation-per-second="14deg" touch-action="pan-y" camera-orbit="${esc(lead.viewer.cameraOrbit)}" interaction-prompt="none" shadow-intensity="0.8"></model-viewer>
          <div class="limits">${roundel('h', metres(lead.stats.size[1]))}</div>
        </figure>
        ${objectLink(lead, '', false)}
      </div>` : '';
    return `    <section class="exit exit-${e.id}" id="${e.id}" aria-labelledby="exit-${e.id}">
      <div class="exit-board">
        <span class="exit-no" aria-hidden="true">${i + 1}</span>
        <div class="exit-title"><h2 id="exit-${e.id}"><span class="visually-hidden">Exit ${i + 1}: </span>${esc(e.name)}</h2>${local(e.localName, 'p')}</div>
        <p class="exit-count">${arrow('up-left')}${count(e.members.length)}</p>
      </div>
      <div class="verge${i === 0 ? ' verge-lead' : ''}">
      ${live}
      <ul class="objects">
        ${(i === 0 ? rest : e.members).map((m) => `<li>${objectLink(m, '')}</li>`).join('\n        ')}
      </ul>
      </div>
    </section>${site.billboards.filter((b) => b.after === e.id).map((b) => `\n${billboard(b, site.billboards.indexOf(b))}`).join('')}`;
  });
  const open = models.filter((m) => m.links.length);
  return `  <main id="road">
${sections.join('\n    <div class="carriageway" aria-hidden="true"></div>\n')}
    <section class="info" id="about" aria-labelledby="about-title">
      <div class="info-board">
        <h2 id="about-title">Malaysia 3D Library</h2>
        <p>${models.length} real objects from Malaysia, each one yours to turn in 3D: the towers and mosques of Kuala Lumpur, the cars on our roads, kopitiam breakfasts, night-market snacks and the kampung.</p>
        <p>${open.length} of them can be downloaded under CC BY 4.0: use them in anything, including paid work, and credit “${esc(site.name)}”. The cars and landmarks are here to look at until the rights in the real designs are checked.</p>
        <p>It is free and open source: the downloadable models are CC BY 4.0 and the site’s code is MIT, all <a href="https://github.com/chengboonrong/malaysia-3d-library">on GitHub</a>. It isn’t affiliated with the owners of the buildings, brands or places its models show.</p>
        <p class="info-hint">Every object has a stone with its catalogue number. Key one into the gantry to drive straight there.</p>
      </div>
    </section>
  </main>`;
}

export function modelPage({ site, m, nearby }) {
  const [w, h, d] = m.stats.size.map(metres);
  const status = m.links.length ? `<section class="sign sign-green downloads" aria-labelledby="downloads-title">
        <h2 id="downloads-title">Download</h2>
        <ul>${m.links.map((l) => `<li><a href="${esc(l.href)}" download="${esc(l.name)}">${arrow('down')}<span>${esc(l.label)}</span><span class="size">${esc(l.size)}</span></a></li>`).join('')}</ul>
        ${m.licence ? `<p>${LICENCES[m.licence] ? `<a href="${LICENCES[m.licence]}">${esc(m.licence)}</a>` : esc(m.licence)}. Credit “${esc(site.name)}”.</p>` : '<p class="plate plate-works">Review copy: public reuse terms are pending.</p>'}
      </section>` : `<section class="sign sign-works" aria-labelledby="status-title">
        <svg class="works" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.6 22.4 12 12 22.4 1.6 12z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M10.8 6.6h2.4l-.4 7.4h-1.6zM12 15.4a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8z"/></svg>
        <div><h2 id="status-title">View only</h2><p>It shows a real design that may be protected, so it can’t be downloaded until those rights are checked. Until then it is here to look at.</p></div>
      </section>`;
  const credits = m.credits.map((c) => `<li><b>${esc(c.part)}:</b> ${c.url ? `<a href="${esc(c.url)}">${esc(c.by)}</a>` : esc(c.by)} · ${c.licence ? esc(c.licence) : 'licence pending'}${c.verified ? '' : ' (not verified)'}${c.note ? ` · ${esc(c.note)}` : ''}</li>`);
  return `  <main class="model">
    <section class="scene" aria-labelledby="title">
      <figure class="stage">
        <model-viewer src="${esc(m.viewer.file)}"${m.poster ? ' poster="poster.webp"' : ''} alt="${esc(m.name)}, interactive 3D model" camera-controls touch-action="pan-y" camera-orbit="${esc(m.viewer.cameraOrbit)}" interaction-prompt="none" shadow-intensity="0.8"></model-viewer>
        <div class="limits">${roundel('h', h)}${roundel('w', w)}</div>
        <figcaption class="stage-controls">
          <span class="hint">Drag to turn. Scroll or pinch to zoom.</span>
          <span class="view-actions" role="group" aria-label="Camera views">
            <button type="button" data-orbit="0deg 80deg auto">Front</button>
            <button type="button" data-orbit="${esc(m.viewer.cameraOrbit)}">Reset</button>
          </span>
        </figcaption>
      </figure>
      <div class="nameplate">${attraction(m, 'h1', ' id="title"')}</div>
    </section>
    <div class="roadside">
      ${status}
      <section class="sign sign-blue facts" aria-labelledby="facts-title">
        <h2 id="facts-title" class="visually-hidden">About this model</h2>
        <p class="summary">${esc(m.summary)}</p>
        <dl>
          <div><dt>Size, W × H × D</dt><dd>${w}&nbsp;×&nbsp;${h}&nbsp;×&nbsp;${d}&nbsp;m</dd></div>
          <div><dt>Triangles</dt><dd>${m.stats.triangles.toLocaleString('en-US')}</dd></div>
          <div><dt>File</dt><dd>GLB 2.0, ${mb(m.stats.bytes)}</dd></div>
          <div><dt>Exit</dt><dd><a href="../../#${m.exit.id}">${esc(m.exit.name)}</a></dd></div>
        </dl>
        <ul class="tags">${m.tags.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>
        <details>
          <summary>Model notes and credits</summary>
          ${m.notes.map((n) => `<p>${esc(n)}</p>`).join('\n          ')}
          <ul class="credits">${credits.join('')}</ul>
        </details>
      </section>
      <nav class="sign sign-green nearby" aria-labelledby="nearby-title">
        <h2 id="nearby-title">Nearby</h2>
        <ul>
          ${nearby.map(({ m: n, dir }) => `<li><a href="../${esc(n.slug)}/">${arrow(dir)}<span class="nearby-name">${esc(n.name)}${local(n.localName)}</span>${n.poster ? `<img src="../${esc(n.slug)}/poster.webp" alt="" width="1200" height="900" loading="lazy" decoding="async">` : ''}</a></li>`).join('\n          ')}
        </ul>
      </nav>
    </div>
  </main>`;
}
