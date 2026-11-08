// Node host: serves /public and runs game rooms over WebSockets.
// Works locally, on a Linux box, or on Railway (uses $PORT).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { RoomCore, randomCode } from './room.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const DATA = process.env.DATA_DIR || path.join(ROOT, 'data');
const PORT = Number(process.env.PORT) || 8787;
fs.mkdirSync(DATA, { recursive: true });

const rooms = new Map(); // code -> { core, sockets:Set, saveTimer }

function loadRoom(code) {
  if (rooms.has(code)) return rooms.get(code);
  const f = path.join(DATA, `${code}.json`);
  if (!fs.existsSync(f)) return null;
  const r = { core: new RoomCore(JSON.parse(fs.readFileSync(f, 'utf8'))), sockets: new Set() };
  rooms.set(code, r);
  return r;
}
function saveRoom(code) {
  const r = rooms.get(code);
  clearTimeout(r.saveTimer);
  r.saveTimer = setTimeout(() => {
    fs.writeFileSync(path.join(DATA, `${code}.json`), JSON.stringify(r.core.toJSON()));
  }, 300);
}

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.ico': 'image/x-icon' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/rooms' && req.method === 'POST') {
    let body = '';
    for await (const c of req) body += c;
    const { pin } = JSON.parse(body || '{}');
    if (!pin || String(pin).length < 3) { res.writeHead(400); return res.end(JSON.stringify({ error: 'PIN must be at least 3 characters' })); }
    let code; do code = randomCode(); while (loadRoom(code));
    rooms.set(code, { core: RoomCore.create(code, pin), sockets: new Set() });
    saveRoom(code);
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ code }));
  }
  const m = url.pathname.match(/^\/api\/rooms\/([A-Z]{4})$/);
  if (m) {
    res.writeHead(loadRoom(m[1]) ? 200 : 404, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ exists: !!loadRoom(m[1]) }));
  }
  let p = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(PUB, p);
  if (!file.startsWith(PUB) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ noServer: true });
server.on('upgrade', (req, sock, head) => {
  const url = new URL(req.url, 'http://x');
  const code = (url.searchParams.get('room') || '').toUpperCase();
  const room = url.pathname === '/ws' && loadRoom(code);
  if (!room) { sock.destroy(); return; }
  wss.handleUpgrade(req, sock, head, ws => {
    const sess = {};
    room.sockets.add(ws);
    ws.on('close', () => room.sockets.delete(ws));
    ws.on('message', raw => {
      let msg; try { msg = JSON.parse(raw); } catch { return; }
      if (msg.t === 'ping') return ws.send('{"t":"pong"}');
      const out = room.core.handle(msg, sess);
      if (out.reply) ws.send(JSON.stringify(out.reply));
      if (out.broadcast) for (const b of out.broadcast) { const s = JSON.stringify(b); for (const w of room.sockets) if (w.readyState === 1) w.send(s); }
      if (out.changed) saveRoom(code);
    });
  });
});

server.listen(PORT, () => console.log(`Delvers' Ledger on http://localhost:${PORT}`));
