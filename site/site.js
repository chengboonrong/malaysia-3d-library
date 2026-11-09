// The gantry: it lights the exit you're in and slides that board to the front. On the home page the exit changes as you
// scroll, and the lane paint between exits moves with you. Also the stone jump and the viewer's Front/Reset buttons.
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const track = document.querySelector('.track');
const boards = [...document.querySelectorAll('.board')];
const exits = [...document.querySelectorAll('main .exit')];

let lit;
function light(id) {
  const board = boards.find((b) => b.hash === `#${id}`) ?? boards.find((b) => b.hasAttribute('aria-current'));
  if (!board || board === lit) return;
  lit = board;
  for (const b of boards) b === board ? b.setAttribute('aria-current', 'location') : b.removeAttribute('aria-current');
  // bring the current board to the front; the browser stops at the end of the road
  track.parentElement.scrollTo({ left: board.parentElement.offsetLeft, behavior: reduce.matches ? 'instant' : 'smooth' });
}

if (exits.length) {
  let queued = false;
  const drive = () => {
    queued = false;
    const line = document.querySelector('.gantry').offsetHeight + 40;
    const here = exits.findLast((e) => e.getBoundingClientRect().top <= line) ?? exits[0];
    light(here.id);
    if (!reduce.matches) document.documentElement.style.setProperty('--drive', Math.round(scrollY));
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(drive); } }, { passive: true });
  addEventListener('resize', () => { lit = null; drive(); });
  drive();
} else light();

// Key a stone number (MY-001 to the last) to drive straight to that object. Digits typed anywhere start one.
const stones = JSON.parse(document.getElementById('stones').textContent);
const form = document.querySelector('.jump'), input = form.querySelector('input'), result = form.querySelector('output');
const numbers = Object.keys(stones).sort();
form.hidden = false;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const n = input.value.replace(/\D/g, '').padStart(3, '0');
  if (stones[n]) location.href = stones[n];
  else result.textContent = `No stone MY-${n}. Stones run from ${numbers[0]} to ${numbers.at(-1)}.`;
});
input.addEventListener('input', () => { result.textContent = ''; });
addEventListener('keydown', (e) => {
  if (!/^\d$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey || e.target.closest('input, textarea, select, [contenteditable]')) return;
  input.value = '';
  input.focus();
});

for (const viewer of document.querySelectorAll('model-viewer[auto-rotate]')) if (reduce.matches) viewer.removeAttribute('auto-rotate');
for (const button of document.querySelectorAll('[data-orbit]')) button.addEventListener('click', () => {
  const viewer = document.querySelector('.scene model-viewer');
  viewer.cameraOrbit = button.dataset.orbit;
  viewer.cameraTarget = 'auto auto auto';
  viewer.fieldOfView = 'auto';
});

// A car's paint chips repaint the material scripts/import-kl-rush.mjs names "paint"; a hex string is read as sRGB.
const paints = document.querySelector('.paints');
if (paints) {
  const viewer = document.querySelector('.scene model-viewer');
  const paint = () => { // also on load, so a chip the browser restored on reload or Back is applied too
    const chosen = paints.querySelector(':checked');
    paints.querySelector('.paint-name').textContent = chosen.parentElement.title;
    viewer.model?.materials.find((m) => m.name === 'paint')?.pbrMetallicRoughness.setBaseColorFactor(chosen.value);
  };
  paints.hidden = false;
  paints.addEventListener('change', paint);
  viewer.addEventListener('load', paint);
}
