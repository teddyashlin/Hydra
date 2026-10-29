'use strict';
// Draws the water-drop app icon procedurally and encodes it as PNG, so no binary assets are needed.
const zlib = require('zlib');

const lerp = (a, b, t) => a + (b - a) * t;

function inDrop(x, y) {
  const cx = 0.5, cy = 0.63, r = 0.32, top = 0.06;
  const dx = x - cx, dy = y - cy;
  if (dx * dx + dy * dy <= r * r) return true;
  if (y < top || y > cy) return false;
  return Math.abs(dx) <= r * Math.pow((y - top) / (cy - top), 1.35);
}

function drawDrop(size) {
  const px = Buffer.alloc(size * size * 4);
  const ss = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let cov = 0, hl = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x + (sx + 0.5) / ss) / size, v = (y + (sy + 0.5) / ss) / size;
          if (!inDrop(u, v)) continue;
          cov++;
          const hx = (u - 0.4) / 0.065, hy = (v - 0.64) / 0.12;
          if (hx * hx + hy * hy <= 1) hl++;
        }
      }
      if (!cov) continue;
      const t = y / size, h = (hl / cov) * 0.75;
      const i = (y * size + x) * 4;
      px[i] = Math.round(lerp(lerp(127, 47, t), 255, h));
      px[i + 1] = Math.round(lerp(lerp(208, 134, t), 255, h));
      px[i + 2] = Math.round(lerp(lerp(245, 196, t), 255, h));
      px[i + 3] = Math.round((cov / (ss * ss)) * 255);
    }
  }
  return px;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function dropPng(size) {
  const raw = drawDrop(size);
  const stride = size * 4;
  const rows = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) raw.copy(rows, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

module.exports = { dropPng };
