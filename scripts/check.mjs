// npm run check (after npm run build): serves dist/ and checks the site in Chromium and WebKit. Every model page must load
// its model without errors. The interaction checks (Front/Reset, downloads, phone layout) run on a sample: every model with
// downloads plus the first model of each category. Then Chromium without WebGL must show each poster.
// One ok/FAIL line per check, exit code 1 on any FAIL. Screenshots go to test-results/.
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { chromium, webkit } from 'playwright';
import { serve } from './serve.mjs';

const site = JSON.parse(readFileSync('site.json', 'utf8'));
const models = readdirSync('models').filter((slug) => existsSync(`models/${slug}/model.json`))
  .map((slug) => ({ slug, ...JSON.parse(readFileSync(`models/${slug}/model.json`, 'utf8')) })).sort((a, b) => a.id.localeCompare(b.id));
const categories = [...new Set(models.map((m) => m.category))];
const sample = models.filter((m) => m.downloads.length || models.find((o) => o.category === m.category) === m);
const VIEWPORTS = { desktop: { width: 1280, height: 860 }, phone: { width: 390, height: 844 } };
const MAGIC = { glb: 'glTF', zip: 'PK' };
mkdirSync('test-results', { recursive: true });
let failed = 0;
const check = (name, pass, detail = '') => {
  console.log(`${pass ? 'ok  ' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
  if (!pass) failed++;
};

// A page that records console errors, uncaught errors, failed requests, 4xx/5xx responses and requests off the site.
async function open(context, href) {
  const page = await context.newPage(), problems = [];
  page.on('request', (r) => { if (!/^(data|blob):/.test(r.url()) && !r.url().startsWith(url)) problems.push(`off-site: ${r.url()}`); });
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', (e) => problems.push(`uncaught: ${e.message}`));
  page.on('requestfailed', (r) => problems.push(`request failed: ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`${r.status()} ${r.url()}`); });
  const res = await page.goto(href);
  return { page, problems, status: res?.status() };
}

// The camera orbit once it stops moving, as "theta phi radius" in radians and metres.
async function settledOrbit(page) {
  let last;
  for (let i = 0; i < 60; i++) {
    const now = await page.evaluate(() => {
      const { theta, phi, radius } = document.querySelector('model-viewer').getCameraOrbit();
      return [theta, phi, radius].map((v) => v.toFixed(3)).join(' ');
    });
    if (now === last) return now;
    last = now;
    await page.waitForTimeout(100);
  }
  return last;
}

const { url, close } = await serve('dist');
const started = Date.now();
try {
  const robots = await fetch(`${url}robots.txt`);
  const robotsText = robots.ok ? await robots.text() : '';
  if (site.public) check('site is public: no robots.txt block', !/Disallow: \/\s*$/m.test(robotsText));
  else check('private: robots.txt disallows everything', robotsText === 'User-agent: *\nDisallow: /\n', `${robots.status}`);
  console.log(`sample for the interaction checks: ${sample.map((m) => m.slug).join(', ')}`);

  for (const engine of [chromium, webkit]) {
    const browser = await engine.launch();
    for (const [size, viewport] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport });
      // model-viewer reports a failed load with an 'error' event, not on the console
      await context.addInitScript(() => addEventListener('error', (e) => {
        if (e.target.localName !== 'model-viewer') return;
        self.modelViewerError = e.detail?.type ?? 'error';
        console.error(`model-viewer error: ${self.modelViewerError}`);
      }, true));
      const tag = `${engine.name()} ${size}`, shot = (name) => `test-results/${engine.name()}-${size}-${name}.png`;
      const pageChecks = async (name, page, problems) => {
        if (!site.public) check(`${tag} ${name}: noindex meta`, await page.$('meta[name="robots"][content="noindex"]') !== null);
        if (size === 'phone') {
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
          check(`${tag} ${name}: no horizontal overflow at ${viewport.width} px`, overflow <= 0, `${overflow} px`);
        }
        check(`${tag} ${name}: no console errors, failed or off-site requests`, !problems.length, problems.join(' | ').slice(0, 500));
      };

      const home = await open(context, url);
      const hrefs = await home.page.$$eval('.cards a', (as) => as.map((a) => a.href));
      check(`${tag} home: one card per model, linking to its page`, hrefs.length === models.length && models.every((m) => hrefs.includes(`${url}models/${m.slug}/`)), `${hrefs.length} cards, ${models.length} models`);
      const headings = await home.page.$$eval('.category', (hs) => hs.map((h) => h.textContent));
      check(`${tag} home: one heading per category, in id order`, headings.join() === categories.join(), headings.join(', '));
      await home.page.screenshot({ path: shot('home'), fullPage: true });
      await pageChecks('home', home.page, home.problems);
      await home.page.close();

      for (const m of size === 'desktop' ? models : sample) {
        const name = `models/${m.slug}/`;
        const { page, problems, status } = await open(context, url + name);
        await page.waitForFunction(() => document.querySelector('model-viewer')?.loaded || self.modelViewerError, null, { timeout: 60000 }).catch(() => {});
        const loaded = await page.evaluate(() => document.querySelector('model-viewer')?.loaded);
        check(`${tag} ${name}: page loads and <model-viewer> loads the model`, status === 200 && loaded, `HTTP ${status}, loaded ${loaded}`);
        if (sample.includes(m)) {
          const start = await settledOrbit(page);
          await page.getByRole('button', { name: 'Front' }).click();
          const front = await settledOrbit(page);
          check(`${tag} ${name}: Front changes the camera orbit`, front !== start, `${start} -> ${front}`);
          await page.getByRole('button', { name: 'Reset' }).click();
          const reset = await settledOrbit(page);
          check(`${tag} ${name}: Reset returns to the default orbit`, reset !== front && reset === start, `${front} -> ${reset}`);
          if (size === 'desktop') for (const link of await page.$$eval('a[download]', (as) => as.map((a) => a.href))) {
            const res = await page.request.get(link), body = await res.body(), want = MAGIC[link.split('.').pop()];
            const local = statSync(`dist${decodeURIComponent(new URL(link).pathname)}`).size;
            check(`${tag} ${name}: download ${link.split('/').pop()}`, res.status() === 200 && body.length === local && !!want && body.subarray(0, want.length).toString('latin1') === want,
              `HTTP ${res.status()}, ${body.length} of ${local} B, starts "${body.subarray(0, 4).toString('latin1')}"`);
          }
          await page.screenshot({ path: shot(m.slug), fullPage: true });
        }
        await pageChecks(name, page, problems);
        await page.close();
      }
      await context.close();
    }
    await browser.close();
  }

  // Without WebGL the poster stays up in place of the model.
  const browser = await chromium.launch({ args: ['--disable-webgl', '--disable-3d-apis'] });
  const page = await browser.newPage({ viewport: VIEWPORTS.desktop });
  const errors = [], posters = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('response', (r) => { if (r.url().endsWith('/poster.webp')) posters.push(r.status()); });
  for (const m of models) {
    posters.length = errors.length = 0;
    await page.goto(`${url}models/${m.slug}/`);
    const shown = await page.waitForFunction(() => {
      const poster = document.querySelector('model-viewer').shadowRoot.querySelector('#default-poster');
      return poster.parentElement.parentElement.classList.contains('show') && /poster\.webp/.test(getComputedStyle(poster).backgroundImage);
    }, null, { timeout: 10000 }).then(() => true, () => false);
    check(`chromium no-webgl models/${m.slug}/: poster image shown`, shown && posters.includes(200), `poster HTTP ${posters.join(',') || 'not requested'}`);
    check(`chromium no-webgl models/${m.slug}/: no uncaught errors`, !errors.length, errors.join(' | ').slice(0, 500));
    if (sample.includes(m)) await page.screenshot({ path: `test-results/chromium-nowebgl-${m.slug}.png` });
  }
  await browser.close();
} finally {
  await close();
}
console.log(`${failed ? `${failed} FAIL` : 'all ok'} (${Math.round((Date.now() - started) / 1000)} s)`);
process.exitCode = failed ? 1 : 0;
