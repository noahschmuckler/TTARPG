// Shared browser helpers: connection, DOM, item cards, toasts, QR.
import { STAT_INFO, SLOT_LABEL, RARITIES, fmt } from './engine.js';
import qrcode from './vendor/qrcode.mjs';

export const $ = (sel, root = document) => root.querySelector(sel);
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const params = new URLSearchParams(location.search);

export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// ------------------------------------------------------------ connection
export function connect({ room, role, pin, onState, onEvents, onStatus, onFatal }) {
  let ws, alive = false, rid = 0, timer;
  const pending = new Map();
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  function open() {
    ws = new WebSocket(`${proto}://${location.host}/ws?room=${encodeURIComponent(room)}`);
    ws.onopen = () => { ws.send(JSON.stringify({ t: 'hello', role, pin })); };
    ws.onmessage = e => {
      const m = JSON.parse(e.data);
      if (m.t === 'welcome') { alive = true; onStatus?.(true); onState(m.state); }
      else if (m.t === 'state') onState(m.state);
      else if (m.t === 'events') onEvents?.(m.events);
      else if (m.t === 'ok' || m.t === 'error') {
        const p = pending.get(m.rid);
        if (p) { pending.delete(m.rid); m.t === 'ok' ? p.res(m.result) : p.rej(new Error(m.msg)); }
        else if (m.t === 'error') { if (m.fatal) { onFatal?.(m.msg); ws.onclose = null; ws.close(); } else toast(m.msg, 'err'); }
      }
    };
    ws.onclose = () => { alive = false; onStatus?.(false); clearTimeout(timer); timer = setTimeout(open, 1200); };
  }
  open();
  setInterval(() => { if (alive) ws.send('{"t":"ping"}'); }, 25000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ws.readyState > 1) open(); });
  return {
    async act(action) {
      for (let i = 0; !alive && i < 40; i++) await new Promise(r => setTimeout(r, 150));
      return new Promise((res, rej) => {
        if (!alive) { toast('Reconnecting… try again in a moment', 'err'); return rej(new Error('offline')); }
        const id = ++rid;
        pending.set(id, { res, rej });
        ws.send(JSON.stringify({ t: 'act', action, rid: id }));
      }).catch(err => { if (err.message !== 'offline') toast(err.message, 'err'); throw err; });
    },
  };
}

// ------------------------------------------------------------ feedback
let toastBox;
export function toast(text, kind = '') {
  toastBox ||= document.body.appendChild(h('<div class="toasts"></div>'));
  const t = h(`<div class="plate toast ${kind}">${esc(text)}</div>`);
  toastBox.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

export function burst(big, small = '', kind = '') {
  const b = h(`<div class="burst ${kind}"><div class="big">${esc(big)}</div><div class="small">${esc(small)}</div></div>`);
  document.body.appendChild(b);
  if (navigator.vibrate) navigator.vibrate(kind === 'hurt' ? [60, 40, 60] : 30);
  setTimeout(() => { b.style.transition = 'opacity .4s'; b.style.opacity = 0; }, 1100);
  setTimeout(() => b.remove(), 1600);
}

export function sheet(inner, { onClose } = {}) {
  const s = h(`<div class="scrim"><div class="plate sheet" style="animation:rise .22s"><button class="x" aria-label="Close">✕</button></div></div>`);
  const body = s.querySelector('.sheet');
  if (typeof inner === 'string') body.insertAdjacentHTML('beforeend', inner); else body.appendChild(inner);
  const close = () => { s.remove(); onClose?.(); };
  s.addEventListener('click', e => { if (e.target === s || e.target.closest('.x')) close(); });
  document.body.appendChild(s);
  return { el: body, close };
}

// ------------------------------------------------------------ items
export function itemHTML(it, extra = '') {
  const R = RARITIES[it.rarity];
  const lines = Object.entries(it.stats).map(([k, v]) => {
    const I = STAT_INFO[k];
    return `<div class="stat ${k === 'dice' || k === 'cleave' ? 'legend' : ''}"><span>${esc(I.label)}</span><b>${esc(I.fmt(v))}</b></div>`;
  }).join('');
  return `<div class="item r-${it.rarity}"><div class="iname">${esc(it.name)}</div><div class="imeta">${R.label} ${SLOT_LABEL[it.slot]}${it.name.includes(it.base) ? '' : ` · ${esc(it.base)}`}</div>${lines}${extra}</div>`;
}

export function qrSVG(text, cell = 4) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}

export { fmt };
