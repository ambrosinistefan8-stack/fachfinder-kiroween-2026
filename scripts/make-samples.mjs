import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { PNG } from 'pngjs';
import QRCode from 'qrcode';

if (!process.argv[2]) throw new Error('Usage: node scripts/make-samples.mjs path/to/blank-shelf.png');
const output = new URL('../public/assets/', import.meta.url);
await mkdir(output, { recursive: true });
const shelf = PNG.sync.read(await readFile(process.argv[2]));
if (shelf.width !== 1536 || shelf.height !== 1024) throw new Error('Expected the 1536 × 1024 source photograph.');

const labels = [
  ['A-01', 315, 337], ['A-02', 715, 337], ['A-03', 1115, 337],
  ['B-01', 315, 724], ['B-02', 715, 724], ['B-03', 1115, 724]
];
for (const [id, x, y] of labels) {
  const payload = `FACHFINDER:${id}`;
  const png = options => QRCode.toBuffer(payload, { margin: 4, errorCorrectionLevel: 'M', ...options });
  await writeFile(new URL(`label-${id}.png`, output), await png({ scale: 8 }));
  const marker = PNG.sync.read(await png({ scale: 3 }));
  PNG.bitblt(marker, shelf, 0, 0, marker.width, marker.height, x, y);
}
await writeFile(new URL('workshop-demo.png', output), PNG.sync.write(shelf));
const closeup = new PNG({ width: 450, height: 300 });
PNG.bitblt(shelf, closeup, 122, 169, closeup.width, closeup.height, 0, 0);
await writeFile(new URL('workshop-closeup.png', output), PNG.sync.write(closeup));
