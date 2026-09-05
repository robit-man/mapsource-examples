import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createClient } from '../typescript/client.ts';
import { toGeoJSON } from './geojson.mjs';

const api = createClient();
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('PORT must be 1024..65535.');
const localOrigin = `http://127.0.0.1:${port}`;
let active = 0;
createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Loopback only, Host + Origin + Fetch Metadata checked to resist browser
  // cross-origin access/DNS rebinding. This is not a production public proxy.
  if (req.headers.host !== `127.0.0.1:${port}` || req.headers.origin && req.headers.origin !== localOrigin || req.headers['sec-fetch-site'] === 'cross-site') { res.writeHead(403).end(); return; }
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  if (active >= 8) { res.writeHead(429, { 'Retry-After': '1' }).end(); return; }
  active++;
  try {
    const url = new URL(req.url, localOrigin);
    if (url.pathname === '/') {
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob:; worker-src blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'");
      res.writeHead(200, { 'Content-Type': 'text/html' }).end(await readFile(new URL('./index.html', import.meta.url))); return;
    }
    if (url.pathname === '/app.mjs') { res.writeHead(200, { 'Content-Type': 'text/javascript' }).end(await readFile(new URL('./app.mjs', import.meta.url))); return; }
    if (/^\/tiles\/(dark|light)\/\d{1,2}\/\d+\/\d+\.png$/.test(url.pathname)) {
      const result = await api.request(`/api${url.pathname}`);
      res.writeHead(200, { 'Content-Type': 'image/png' }).end(result.body); return;
    }
    let data;
    if (url.pathname === '/features') {
      const result = await api.features(url.searchParams.get('category') || 'cafes', (url.searchParams.get('bbox') || '').split(',').map(Number));
      data = { engineMode: result.engineMode, geojson: toGeoJSON(result.data) };
    } else if (url.pathname === '/elevation') data = await api.elevation(Number(url.searchParams.get('lat') ?? NaN), Number(url.searchParams.get('lon') ?? NaN));
    else if (url.pathname === '/status') data = await api.json('/api/status', { authenticated: false });
    else { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(data));
  } catch (error) {
    // Client-generated errors contain no key/URL; never serialize raw request objects.
    const message = error instanceof Error ? error.message : 'Request failed';
    const safe = message.startsWith('Planet') || message.startsWith('Mapsource HTTP') || message.startsWith('Set MAPSOURCE') || message.startsWith('Choose ') ? message : 'Request failed. Check service status, bounds, and quota.';
    res.writeHead(502, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: safe }));
  } finally { active--; }
}).listen(port, '127.0.0.1', () => console.log(`Map demo: ${localOrigin}. API key remains in the local server environment. Do not tunnel this demo.`));
