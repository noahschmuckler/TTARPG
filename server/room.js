// Room core shared by the Node server and the Cloudflare Durable Object.
// Holds authoritative state, checks permissions, keeps an undo stack.
import { apply, isGmOnly, newGame } from '../public/engine.js';

const UNDO_DEPTH = 40;

export class RoomCore {
  constructor(data) {
    this.state = data.state;
    this.pin = String(data.pin);
    this.history = data.history || [];
  }

  static create(code, pin) {
    return new RoomCore({ state: newGame(code), pin, history: [] });
  }

  toJSON() {
    return { state: this.state, pin: this.pin, history: this.history.slice(0, 15) };
  }

  // msg: parsed client message; sess: mutable per-connection object {role}
  // Returns { reply?: object, broadcast?: object[], changed: bool }
  handle(msg, sess) {
    if (msg.t === 'hello') {
      if (msg.role === 'gm') {
        if (String(msg.pin) !== this.pin) return { reply: { t: 'error', msg: 'Wrong GM PIN', fatal: true } };
        sess.role = 'gm';
      } else sess.role = 'player';
      return { reply: { t: 'welcome', role: sess.role, state: this.state } };
    }
    if (!sess.role) return { reply: { t: 'error', msg: 'Say hello first' } };
    if (msg.t !== 'act' || !msg.action) return { reply: { t: 'error', msg: 'Bad message' } };

    const a = msg.action;
    if (a.type === 'undo') {
      if (sess.role !== 'gm') return { reply: { t: 'error', msg: 'Only the GM can undo' } };
      const prev = this.history.shift();
      if (!prev) return { reply: { t: 'error', msg: 'Nothing to undo' } };
      const rev = this.state.rev;
      this.state = JSON.parse(prev);
      this.state.rev = rev + 1;
      this.state.log.unshift({ t: Date.now(), text: '↶ The GM turned back time.', kind: 'info' });
      return { changed: true, broadcast: [{ t: 'state', state: this.state }] };
    }
    if (a.type === 'restore') { // GM loads a saved snapshot (Headquarters → Restore backup)
      if (sess.role !== 'gm') return { reply: { t: 'error', msg: 'GM only', rid: msg.rid } };
      const st = a.state?.state || a.state; // accept either a bare state or a {savedAt, room, state} backup file
      if (!st || typeof st !== 'object' || !st.characters || !Array.isArray(st.order) || !st.enemies || !Array.isArray(st.log))
        return { reply: { t: 'error', msg: "That doesn't look like a Delvers' Ledger backup", rid: msg.rid } };
      this.history.unshift(JSON.stringify(this.state));
      if (this.history.length > UNDO_DEPTH) this.history.length = UNDO_DEPTH;
      const rev = this.state.rev, code = this.state.code;
      this.state = JSON.parse(JSON.stringify(st));
      this.state.code = code; // a backup can be loaded into any room
      this.state.rev = rev + 1;
      this.state.log.unshift({ t: Date.now(), text: '⟲ The GM restored a saved game.', kind: 'info' });
      return { changed: true, broadcast: [{ t: 'state', state: this.state }], reply: { t: 'ok', rid: msg.rid, result: null } };
    }
    if (a.type === 'resetGame') {
      if (sess.role !== 'gm') return { reply: { t: 'error', msg: 'GM only' } };
      this.history.unshift(JSON.stringify(this.state));
      const rev = this.state.rev;
      this.state = newGame(this.state.code);
      this.state.rev = rev + 1;
      return { changed: true, broadcast: [{ t: 'state', state: this.state }] };
    }
    if (isGmOnly(a.type) && sess.role !== 'gm') return { reply: { t: 'error', msg: 'Only the GM can do that' } };

    const snapshot = JSON.stringify(this.state);
    const r = apply(this.state, a);
    if (r.error) return { reply: { t: 'error', msg: r.error, rid: msg.rid } };
    this.history.unshift(snapshot);
    if (this.history.length > UNDO_DEPTH) this.history.length = UNDO_DEPTH;
    this.state.rev += 1;
    const out = [{ t: 'state', state: this.state }];
    if (r.events.length) out.push({ t: 'events', events: r.events });
    return { changed: true, broadcast: out, reply: { t: 'ok', rid: msg.rid, result: r.result || null } };
  }
}

export function randomCode() {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let s = '';
  for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
  return s;
}
