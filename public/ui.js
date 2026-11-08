// Shared browser helpers: connection, DOM, item cards, toasts, QR.
import { STAT_INFO, SLOT_LABEL, RARITIES, SETS, SYNERGIES, fmt, setCounts, activeSynergies, powersFor, statsText, synergyText, describeEffects, isAttackPower } from './engine.js';
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
  const S = it.set && SETS[it.set];
  return `<div class="item r-${it.rarity}" ${S ? `style="--rc:${S.color}"` : ''}><div class="iname">${esc(it.name)}</div><div class="imeta">${S ? `✦ ${esc(S.name)} set · ${SLOT_LABEL[it.slot]}` : `${R.label} ${SLOT_LABEL[it.slot]}${it.name.includes(it.base) ? '' : ` · ${esc(it.base)}`}`}</div>${lines}${S ? `<div class="setnote">Set power: ${esc(S.power.name)}</div>` : ''}${extra}</div>`;
}

// Sets the hero owns pieces of (equipped or in the satchel), their tiers, and synergies.
export function setsHTML(ch, { gm = false } = {}) {
  const counts = setCounts(ch);
  const owned = {};
  for (const it of [...Object.values(ch.gear || {}), ...(ch.bag || [])]) if (it?.set) (owned[it.set] ||= new Set()).add(it.slot);
  const powers = powersFor(ch);
  const keys = Object.keys(owned);
  const found = new Set(ch.found || []);
  const active = new Set(activeSynergies(ch).map(sy => sy.key));
  const known = SYNERGIES.filter(sy => found.has('syn:' + sy.key) || (gm && Object.keys(sy.needs).some(k => owned[k])));
  const hidden = SYNERGIES.length - known.length;
  if (!keys.length && !known.length) return `<p class="faint center" style="margin:0;font-size:14px">No set pieces yet. Equip one to unlock a new power.${hidden ? ` ${hidden} hidden synergies are waiting to be found.` : ''}</p>`;
  const sets = keys.map(k => {
    const S = SETS[k], n = counts[k] || 0, pw = powers.find(p => p.set === k);
    const pips = Object.entries(S.pieces).map(([slot, name]) => {
      const eq = ch.gear?.[slot]?.set === k, has = owned[k].has(slot);
      return `<span class="pip ${eq ? 'on' : has ? 'bag' : ''}" title="${esc(name)}${eq ? ' (equipped)' : has ? ' (in satchel)' : ''}">${SLOT_LABEL[slot]}</span>`;
    }).join('');
    const pe = S.power.effects(Math.max(1, n));
    const preview = describeEffects(pe, { attack: isAttackPower({ effects: pe }) });
    const tiers = [`<div class="tier ${n >= 1 ? 'on' : ''}"><b>1</b><span>${esc(S.power.name)}: ${esc(n ? pw.text : preview)}${pw?.boosted?.length ? ` <i>(boosted by ${esc(pw.boosted.join(', '))})</i>` : ''}</span></div>`,
      ...S.bonuses.map(b => `<div class="tier ${n >= b.n ? 'on' : ''}"><b>${b.n}</b><span>${esc(statsText(b.stats))}</span></div>`)].join('');
    return `<div class="setcard" style="--rc:${S.color}"><div class="row"><span class="sn grow">✦ ${esc(S.name)}</span><span class="num">${n}/4</span></div>
      <div class="pips">${pips}</div>${tiers}<div class="tier faint"><b>+</b><span>Each piece equipped strengthens ${esc(S.power.name)}.</span></div></div>`;
  }).join('');
  const syn = known.map(sy => `<div class="syncard ${active.has(sy.key) ? 'on' : ''}"><div class="row"><span class="sn grow">⟡ ${esc(sy.name)}</span><span class="faint" style="font-size:12px">${active.has(sy.key) ? 'ACTIVE' : 'dormant'}</span></div>
    <div class="faint" style="font-size:13px">${Object.entries(sy.needs).map(([k, n]) => `${n} ${esc(SETS[k].name)}`).join(' + ')}</div><div style="font-size:14px">${esc(synergyText(sy))}</div></div>`).join('');
  return `${sets}${syn}${!gm && hidden ? `<p class="faint center" style="font-size:13px;margin:8px 0 0">⟡ ${hidden} hidden synerg${hidden === 1 ? 'y waits' : 'ies wait'} to be discovered by combining pieces of different sets.</p>` : ''}`;
}

export function qrSVG(text, cell = 4) {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: cell, margin: 2, scalable: true });
}

export { fmt };

// ------------------------------------------------------------ board map
// Draws the last board snapshot, resolved against the live game (fallen foes disappear).
export function boardMapSVG(S, { highlight } = {}) {
  const B = S.board;
  if (!B || !B.tokens) return '';
  const w = B.w || 36, h = B.h || 24;
  const pos = new Map();
  const items = [];
  for (const t of B.tokens) {
    if (t.kind === 'hero') { const c = S.characters[t.ref]; if (!c) continue; pos.set(c.id, t); items.push({ t, kind: 'hero', label: c.name, me: c.id === highlight, down: c.hp <= 0, hidden: c.hidden }); }
    else if (t.kind === 'foe' || t.kind === 'minion') {
      const e = t.ref ? S.enemies[t.ref] : null;
      if (t.ref && !e) continue; // slain since the snapshot
      items.push({ t, kind: t.kind, label: e?.name || 'Minion', target: e?.target, pinned: e?.pinned, boss: e?.type === 'boss' });
    } else items.push({ t, kind: 'unknown', label: `#${t.id}` });
  }
  const grid = [];
  for (let x = 0; x <= w; x++) grid.push(`<line x1="${x}" y1="0" x2="${x}" y2="${h}"/>`);
  for (let y = 0; y <= h; y++) grid.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}"/>`);
  const lines = items.filter(i => i.target && pos.has(i.target)).map(i => { const p = pos.get(i.target); return `<line class="eng" x1="${i.t.x}" y1="${i.t.y}" x2="${p.x}" y2="${p.y}"/>`; });
  const tok = items.map(i => {
    const { x, y } = i.t;
    if (i.kind === 'hero') return `<g class="tok hero ${i.me ? 'me' : ''} ${i.down ? 'down' : ''}"><circle cx="${x}" cy="${y}" r="0.45"/>${i.hidden ? `<circle class="hid" cx="${x}" cy="${y}" r="0.62"/>` : ''}<text x="${x}" y="${y + 0.17}">${esc(i.label[0] || '?')}</text><text class="lab" x="${x}" y="${y - 0.65}">${esc(i.label)}</text></g>`;
    if (i.kind === 'foe') { const r = i.boss ? 0.75 : 0.5; return `<g class="tok foe ${i.boss ? 'boss' : ''}"><polygon points="${[0, 1, 2, 3, 4, 5].map(k => `${x + r * Math.cos(Math.PI / 3 * k)},${y + r * Math.sin(Math.PI / 3 * k)}`).join(' ')}"/><text class="lab" x="${x}" y="${y - r - 0.2}">${i.pinned ? '📌 ' : ''}${esc(i.label)}</text></g>`; }
    if (i.kind === 'minion') return `<g class="tok minion"><circle cx="${x}" cy="${y}" r="0.32"/><text x="${x}" y="${y + 0.12}">☠</text></g>`;
    return `<g class="tok unk"><rect x="${x - 0.3}" y="${y - 0.3}" width="0.6" height="0.6"/><text class="lab" x="${x}" y="${y - 0.45}">${esc(i.label)}</text></g>`;
  });
  const corners = [[0, 0], [w - 2, 0], [w - 2, h - 2], [0, h - 2]].map(([x, y]) => `<rect class="corner" x="${x}" y="${y}" width="2" height="2"/>`);
  return `<svg class="boardmap" viewBox="-0.5 -0.9 ${w + 1} ${h + 1.4}" xmlns="http://www.w3.org/2000/svg">
    <rect class="felt" x="0" y="0" width="${w}" height="${h}"/><g class="grid">${grid.join('')}</g>${corners.join('')}${lines.join('')}${tok.join('')}</svg>`;
}

// A hero's portrait (a photo of their mini) or, without one, their calling's glyph.
export function heroIcon(ch, glyph, size = 28) {
  return ch.portrait ? `<img class="portrait" src="${esc(ch.portrait)}" alt="" style="width:${size}px;height:${size}px">` : glyph;
}
