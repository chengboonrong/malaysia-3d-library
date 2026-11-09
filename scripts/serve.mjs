// Static server for posters.mjs and check.mjs: const { url, close } = await serve('dist'), on a free port.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.txt': 'text/plain', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.zip': 'application/zip', '.wasm': 'application/wasm' };

export async function serve(dir) {
  const root = resolve(dir);
  const server = createServer(async (req, res) => {
    try {
      let file = join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!(file + sep).startsWith(root + sep)) throw new Error('outside root');
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream', 'content-length': body.length }).end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () => { server.closeAllConnections(); return new Promise((done) => server.close(done)); },
  };
}
