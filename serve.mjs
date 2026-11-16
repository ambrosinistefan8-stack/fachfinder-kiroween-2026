import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const base = fileURLToPath(new URL('./dist/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const port = Number(process.env.PORT ?? 5733);

createServer(async (request, response) => {
  if (!['GET', 'HEAD'].includes(request.method)) {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let target;
  try {
    const url = new URL(request.url, 'http://localhost');
    const requested = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    target = path.resolve(base, `.${requested}`);
    const relative = path.relative(base, target);
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Path outside app');
    const meta = await stat(target);
    if (!meta.isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': types[path.extname(target)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Content-Length': meta.size });
    if (request.method === 'HEAD') response.end();
    else createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Diese Seite wurde nicht gefunden.');
  }
}).listen(port, '127.0.0.1', () => console.log(`Fachfinder: http://127.0.0.1:${port}/`));
