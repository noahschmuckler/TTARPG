// Cloudflare host: static assets + one Durable Object per game room.
import { DurableObject } from 'cloudflare:workers';
import { RoomCore, randomCode } from '../server/room.js';
import ASSETS from './assets.gen.js';

const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/api/rooms' && req.method === 'POST') {
      const { pin } = await req.json().catch(() => ({}));
      if (!pin || String(pin).length < 3) return json({ error: 'PIN must be at least 3 characters' }, 400);
      for (let i = 0; i < 6; i++) {
        const code = randomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        const r = await stub.fetch('https://room/init', { method: 'POST', body: JSON.stringify({ code, pin }) });
        if (r.ok) return json({ code });
      }
      return json({ error: 'Could not allocate a room' }, 500);
    }
    const m = url.pathname.match(/^\/api\/rooms\/([A-Z]{4})$/);
    if (m) {
      const stub = env.ROOMS.get(env.ROOMS.idFromName(m[1]));
      return stub.fetch('https://room/exists');
    }
    if (url.pathname === '/ws') {
      const code = (url.searchParams.get('room') || '').toUpperCase();
      if (!/^[A-Z]{4}$/.test(code)) return new Response('bad room', { status: 400 });
      return env.ROOMS.get(env.ROOMS.idFromName(code)).fetch(req);
    }
    const path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
    const a = ASSETS[path];
    if (!a) return new Response('Not found', { status: 404 });
    if (a.b64) return new Response(Uint8Array.from(atob(a.b64), c => c.charCodeAt(0)), { headers: { 'content-type': a.type, 'cache-control': 'public, max-age=86400' } });
    return new Response(a.body, { headers: { 'content-type': a.type, 'cache-control': 'no-cache' } });
  },
};

export class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.core = null;
    ctx.blockConcurrencyWhile(async () => {
      const data = await ctx.storage.get('room');
      if (data) this.core = new RoomCore(data);
    });
  }

  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === '/init') {
      if (this.core) return new Response('taken', { status: 409 });
      const { code, pin } = await req.json();
      this.core = RoomCore.create(code, pin);
      await this.ctx.storage.put('room', this.core.toJSON());
      return new Response('ok');
    }
    if (url.pathname === '/exists') return json({ exists: !!this.core }, this.core ? 200 : 404);
    if (req.headers.get('Upgrade') !== 'websocket') return new Response('expected websocket', { status: 426 });
    if (!this.core) return new Response('no such room', { status: 404 });
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment({});
    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws, raw) {
    let msg; try { msg = JSON.parse(raw); } catch { return; }
    if (msg.t === 'ping') return ws.send('{"t":"pong"}');
    const sess = ws.deserializeAttachment() || {};
    const out = this.core.handle(msg, sess);
    ws.serializeAttachment(sess);
    if (out.reply) ws.send(JSON.stringify(out.reply));
    if (out.broadcast) for (const b of out.broadcast) {
      const s = JSON.stringify(b);
      for (const w of this.ctx.getWebSockets()) { try { w.send(s); } catch {} }
    }
    if (out.changed) await this.ctx.storage.put('room', this.core.toJSON());
  }

  webSocketClose(ws, code) { try { ws.close(code, 'bye'); } catch {} }
}
