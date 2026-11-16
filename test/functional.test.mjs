import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { evaluateMatch, searchInventory } from '../public/inventory.mjs';
import { scanPixels } from '../public/scan.mjs';

function readSample(name) {
  return PNG.sync.read(readFileSync(new URL(`../public/assets/${name}.png`, import.meta.url)));
}

test('the workshop photo yields all six QR bins and image-relative coordinates', () => {
  const labels = scanPixels(jsQR, readSample('workshop-demo'));
  assert.deepEqual(labels.map(mark => mark.bin).sort(), ['A-01', 'A-02', 'A-03', 'B-01', 'B-02', 'B-03']);
  const target = labels.find(mark => mark.bin === 'A-02');
  assert(target.left > .45 && target.left < .52);
  assert(target.top > .30 && target.top < .39);
});

test('the wrong close-up never confirms the requested tool', () => {
  const item = searchInventory('imbus 5')[0];
  const labels = scanPixels(jsQR, readSample('workshop-closeup')).map(mark => mark.bin);
  assert.deepEqual(labels, ['A-01']);
  assert.equal(evaluateMatch(item, labels).kind, 'wrong');
  assert.equal(evaluateMatch(item, ['A-02']).kind, 'match');
});

test('a blank photo has no matches and a real printable label can be read', () => {
  const blank = new PNG({ width: 64, height: 64 });
  blank.data.fill(255);
  assert.deepEqual(scanPixels(jsQR, blank), []);
  assert.deepEqual(scanPixels(jsQR, readSample('label-B-03')).map(mark => mark.bin), ['B-03']);
});
