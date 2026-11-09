// npm run posters [-- --all] (after npm run build): renders models/<slug>/poster.webp for every model that has none
// (--all: every model) from its page's default camera in Chromium, at 1200 x 900. Run npm run build again afterwards.
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

const W = 1200, H = 900;
const slugs = readdirSync('dist/models').filter((slug) => process.argv.includes('--all') || !existsSync(`models/${slug}/poster.webp`));
if (!slugs.length) console.log('every model has a poster; --all renders them again');
const { url, close } = await serve('dist');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  for (const slug of slugs) {
    await page.goto(`${url}models/${slug}/`);
    const { bytes, w, h } = await page.evaluate(async () => {
      const viewer = document.querySelector('model-viewer');
      await customElements.whenDefined('model-viewer');
      viewer.constructor.minimumRenderScale = 1; // no dynamic resolution drop on a slow (software) renderer
      viewer.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:9';
      if (!viewer.loaded) await new Promise((loaded, failed) => {
        viewer.addEventListener('load', loaded, { once: true });
        viewer.addEventListener('error', (e) => failed(new Error(`model-viewer error: ${e.detail?.type}`)), { once: true });
      });
      const frames = () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      await frames(); // let the resize reframe the camera, then snap to it
      viewer.jumpCameraToGoal();
      await frames();
      const blob = await viewer.toBlob({ mimeType: 'image/webp', qualityArgument: 0.85 });
      const { width, height } = await createImageBitmap(blob);
      return { bytes: [...new Uint8Array(await blob.arrayBuffer())], w: width, h: height };
    });
    const webp = Buffer.from(bytes);
    if (webp.toString('ascii', 8, 12) !== 'WEBP' || w !== W || h !== H) throw new Error(`${slug}: expected a ${W} x ${H} WebP, got ${w} x ${h}`);
    writeFileSync(`models/${slug}/poster.webp`, webp);
    console.log(`wrote models/${slug}/poster.webp (${w} x ${h}, ${webp.length.toLocaleString('en-US')} B)`);
  }
} finally {
  await browser.close();
  await close();
}
