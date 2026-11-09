// Download copy of a view-only GLB: meshopt geometry decoded, quantized attributes back to floats and KTX2 textures
// transcoded to PNG, so the file opens in any glTF tool. The credit and licence go in asset.copyright.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { crc32, deflateSync } from 'node:zlib';
import { dequantize } from '@gltf-transform/functions';

// three ships the Basis transcoder as a CommonJS script inside an ES-module package, so it is evaluated by hand
const dir = 'node_modules/three/examples/jsm/libs/basis', cjs = { exports: {} };
new Function('module', 'exports', 'require', '__dirname', readFileSync(`${dir}/basis_transcoder.js`, 'utf8'))(cjs, cjs.exports, createRequire(import.meta.url), dir);
const basis = cjs.exports({ wasmBinary: readFileSync(`${dir}/basis_transcoder.wasm`) })
  .then((b) => (b.initializeBasis(), b));
const RGBA32 = 13; // basis transcoder_texture_format.cTFRGBA32

function png(width, height, rgba) {
  const chunk = (type, data) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]), len = Buffer.alloc(4), crc = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8; // bits per channel
  header[9] = 6; // RGBA
  const stride = width * 4, rows = Buffer.alloc((stride + 1) * height); // each row starts with filter type 0
  for (let y = 0; y < height; y++) rows.set(rgba.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

async function ktx2ToPng(bytes) {
  const file = new (await basis).KTX2File(new Uint8Array(bytes));
  try {
    if (!file.isValid() || !file.startTranscoding()) throw new Error('unreadable KTX2 texture');
    const { origWidth, origHeight } = file.getImageLevelInfo(0, 0, 0);
    const rgba = new Uint8Array(file.getImageTranscodedSizeInBytes(0, 0, 0, RGBA32));
    if (!file.transcodeImage(rgba, 0, 0, 0, RGBA32, 0, -1, -1)) throw new Error('KTX2 texture failed to transcode');
    return png(origWidth, origHeight, rgba);
  } finally {
    file.close();
    file.delete();
  }
}

const PACKING = ['EXT_meshopt_compression', 'KHR_meshopt_compression', 'KHR_texture_basisu', 'KHR_mesh_quantization'];
export async function unpack(io, file, copyright) {
  const doc = await io.read(file);
  for (const t of doc.getRoot().listTextures()) if (t.getMimeType() === 'image/ktx2') t.setImage(await ktx2ToPng(t.getImage())).setMimeType('image/png');
  await doc.transform(dequantize());
  for (const e of doc.getRoot().listExtensionsUsed()) if (PACKING.includes(e.extensionName)) e.dispose();
  doc.getRoot().getAsset().copyright = copyright;
  return io.writeBinary(doc);
}
