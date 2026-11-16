import { cp, mkdir, copyFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const source = new URL('public/', root);
const target = new URL('dist/', root);
await cp(source, target, { recursive: true });
await mkdir(new URL('vendor/', target), { recursive: true });
await copyFile(new URL('node_modules/jsqr/dist/jsQR.js', root), new URL('vendor/jsQR.js', target));
await copyFile(new URL('node_modules/jsqr/LICENSE', root), new URL('vendor/jsQR.LICENSE', target));
console.log('Built static site into dist/.');
