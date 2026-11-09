// Seam check for a repeatable building module: npm run seam -- <file.glb> [--width=5.6] [--pillars=2.55]
// Tiles the module along X at `width` and reports what a viewer would see at the seam:
//   overhang  geometry past ±width/2 (tiled copies overlap or z-fight)
//   envelope  roofline and street-front profiles 1 cm inside each edge must match, or the row shows steps
//   arcade    columns or walls at the seam inside the five-foot way; on both edges = a doubled column at every seam
// --pillars=X adds two runtime-style 0.5 x 4.2 x 0.5 shafts at x = ±X, z = 7.7 (simulates the library prototype).
// Exit code 1 when any check fails. build.mjs imports seamCheck() and fails the build the same way.
import { NodeIO } from '@gltf-transform/core';
import { fileURLToPath } from 'node:url';

export async function seamCheck(file, W = 5.6, pillars = 0) {
  const H = W / 2, TOL = 0.002, EPS = 0.01;
  const doc = await new NodeIO().read(file);

  const tris = []; // [[x,y,z] x3]
  const mul = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh(); if (!mesh) continue;
    const m = node.getWorldMatrix();
    for (const prim of mesh.listPrimitives()) {
      if (prim.getMode() !== 4) continue;
      const pos = prim.getAttribute('POSITION'), idx = prim.getIndices();
      const v = (i) => mul(m, pos.getElement(i, []));
      const n = idx ? idx.getCount() : pos.getCount(), at = (k) => (idx ? idx.getScalar(k) : k);
      for (let k = 0; k < n; k += 3) tris.push([v(at(k)), v(at(k + 1)), v(at(k + 2))]);
    }
  }
  if (pillars) for (const s of [-1, 1]) { // a box as 12 triangles
    const [cx, cz, hw, h] = [s * pillars, 7.7, 0.25, 4.2];
    const p = (i) => [cx + (i & 1 ? hw : -hw), i & 2 ? h : 0, cz + (i & 4 ? hw : -hw)];
    for (const [a, b, c, d] of [[0, 1, 3, 2], [4, 6, 7, 5], [0, 4, 5, 1], [2, 3, 7, 6], [0, 2, 6, 4], [1, 5, 7, 3]]) tris.push([p(a), p(b), p(c)], [p(a), p(c), p(d)]);
  }

  const all = tris.flat(), lo = [0, 1, 2].map((k) => Math.min(...all.map((p) => p[k]))), hi = [0, 1, 2].map((k) => Math.max(...all.map((p) => p[k])));
  console.log(`${file}: ${tris.length} triangles; bounds x ${lo[0].toFixed(4)}..${hi[0].toFixed(4)}, y ${lo[1].toFixed(3)}..${hi[1].toFixed(3)}, z ${lo[2].toFixed(3)}..${hi[2].toFixed(3)}`);
  let fail = false;

  const over = Math.max(hi[0] - H, -H - lo[0]);
  console.log(over > TOL ? `FAIL overhang: geometry reaches ${over.toFixed(3)} m past the ${W} m module edge; tiled copies overlap` : `ok   overhang: within ±${H} m`);
  fail ||= over > TOL;

  // Section of the mesh by the plane x = c, as (y, z) segments.
  function section(c) {
    const segs = [];
    for (const t of tris) {
      const pts = [];
      for (let i = 0; i < 3; i++) {
        const a = t[i], b = t[(i + 1) % 3], da = a[0] - c, db = b[0] - c;
        if ((da < 0) !== (db < 0)) { const u = da / (da - db); pts.push([a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]); }
      }
      if (pts.length === 2) segs.push(pts);
    }
    return segs;
  }
  const samples = (segs) => segs.flatMap(([a, b]) => {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.02));
    return Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  });
  const R = samples(section(H - EPS)), L = samples(section(-H + EPS));
  const box = (ps) => ps.length ? `y ${Math.min(...ps.map((p) => p[0])).toFixed(2)}..${Math.max(...ps.map((p) => p[0])).toFixed(2)}, z ${Math.min(...ps.map((p) => p[1])).toFixed(2)}..${Math.max(...ps.map((p) => p[1])).toFixed(2)}` : '';
  // Envelope profiles a viewer sees across the seam: the roofline (top y per 5 cm of depth) and the street front (front z per
  // 5 cm of height). Party walls inside the envelope may differ per side; they meet back to back and stay hidden.
  function profile(ps, by, of) {
    const m = new Map();
    for (const p of ps) { const k = Math.round(p[by] / 0.05); m.set(k, Math.max(m.get(k) ?? -Infinity, p[of])); }
    return m;
  }
  for (const [name, by, of, label] of [['roofline', 1, 0, 'z'], ['front', 0, 1, 'y']]) {
    const r = profile(R, by, of), l = profile(L, by, of), bad = [];
    for (const k of new Set([...r.keys(), ...l.keys()])) {
      const d = (r.get(k) ?? -Infinity) - (l.get(k) ?? -Infinity);
      if (!(Math.abs(d) <= 0.01)) bad.push([k * 0.05, d]);
    }
    bad.sort((a, b) => a[0] - b[0]);
    if (!bad.length) console.log(`ok   ${name}: left and right edges match within 1 cm`);
    else {
      const runs = []; // consecutive bins with about the same step, as [from, to, step]
      for (const [at, d] of bad) {
        const last = runs.at(-1), dd = Number.isFinite(d) ? d : NaN;
        if (last && at - last[1] < 0.06 && (Number.isNaN(dd) ? Number.isNaN(last[2]) : Math.abs(dd - last[2]) < 0.02)) last[1] = at; else runs.push([at, at, dd]);
      }
      const fmt = ([a, b, d]) => `${label} ${a.toFixed(2)}..${b.toFixed(2)}: ${Number.isNaN(d) ? 'one side only' : (d > 0 ? '+' : '') + d.toFixed(3) + ' m'}`;
      console.log(`FAIL ${name}: the edges differ by more than 1 cm (right minus left):\n     ${runs.map(fmt).join('\n     ')}`);
      fail = true;
    }
  }

  // a column or party wall standing in the five-foot way; beams and soffits above 3.5 m span the seam and are fine
  const arcade = (ps) => { const v = ps.filter(([y, z]) => z > 5.6 && z < 7.95 && y > 0.3 && y < 3.5); return v.length && Math.max(...v.map((p) => p[0])) - Math.min(...v.map((p) => p[0])) > 2 ? v : []; };
  const aR = arcade(R), aL = arcade(L);
  if (!aR.length && !aL.length) console.log('ok   arcade: five-foot way open at both seams (a row adds one shared column per boundary)');
  else {
    console.log(`${aR.length && aL.length ? 'FAIL' : 'note'} arcade: solids at the seam inside the five-foot way: right ${box(aR) || 'none'}; left ${box(aL) || 'none'}`);
    if (aR.length && aL.length) { console.log('     both edges carry a solid, so every tiled seam gets two side by side'); fail = true; }
  }
  return !fail;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(3).map((a) => a.replace(/^--/, '').split('=')));
  process.exitCode = (await seamCheck(process.argv[2], Number(args.width ?? 5.6), Number(args.pillars ?? 0))) ? 0 : 1;
}
