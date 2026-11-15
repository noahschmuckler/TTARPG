// Shared drawing of the peak as set up on the table (photo, Nov 15). Grid: 24 cols x 36 rows, row 1 at the gate.
window.drawPeak = function (svg, marks, title, note) {
  const C = 26, X0 = 34, Y0 = 70, NS = 'http://www.w3.org/2000/svg';
  const el = (t, a, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; svg.appendChild(e); return e; };
  const X = c => X0 + (c - 1) * C, Y = r => Y0 + (r - 1) * C;
  el('text', { x: X0, y: 30, 'font-size': 22, 'font-weight': 'bold', fill: '#f3e6cc', 'font-family': 'Georgia' }, title);
  if (note) el('text', { x: X0, y: 54, 'font-size': 14, fill: '#cfc2a8', 'font-family': 'Georgia' }, note);
  el('rect', { x: X(1), y: Y(1), width: 24 * C, height: 36 * C, fill: '#c9d6e3' });
  for (let r = 1; r <= 37; r++) el('line', { x1: X(1), x2: X(25), y1: Y(r), y2: Y(r), stroke: '#8fa0b3', 'stroke-width': .7 });
  for (let c = 1; c <= 25; c++) el('line', { x1: X(c), x2: X(c), y1: Y(1), y2: Y(37), stroke: '#8fa0b3', 'stroke-width': .7 });
  for (let r = 1; r <= 36; r += 5) el('text', { x: X0 - 6, y: Y(r) + 17, 'font-size': 11, 'text-anchor': 'end', fill: '#9aa' }, r);
  for (let c = 1; c <= 24; c += 4) el('text', { x: X(c) + 13, y: Y(37) + 14, 'font-size': 11, 'text-anchor': 'middle', fill: '#9aa' }, c);
  el('rect', { x: X(10), y: Y(1) - 16, width: 6 * C, height: 16, fill: '#6f8a5a', stroke: '#2a3a20' });
  el('text', { x: X(13), y: Y(1) - 4, 'font-size': 11, 'text-anchor': 'middle', fill: '#fff' }, 'THE GATE');
  const circle = (c, r, name) => { el('circle', { cx: X(c), cy: Y(r), r: 3.5 * C, fill: 'rgba(60,110,190,.15)', stroke: '#2f5fb0', 'stroke-width': 3 }); el('text', { x: X(c), y: Y(r) + 5, 'font-size': 15, 'font-weight': 'bold', 'text-anchor': 'middle', fill: '#2f5fb0' }, name); };
  circle(6.5, 6.5, 'EYE'); circle(19.5, 6.5, 'MAW'); circle(13, 13.5, 'COIL');
  for (const [c, r] of [[2.5, 10.5], [9.5, 10.5], [16, 10.5], [23, 10.5], [10, 17.3], [16.5, 17.3]]) el('circle', { cx: X(c), cy: Y(r), r: C * .95, fill: 'none', stroke: '#d33', 'stroke-width': 2 });
  const block = (c, r, w, h, fill, label, lc = '#fff') => { el('rect', { x: X(c), y: Y(r), width: w * C, height: h * C, fill, stroke: '#222', 'stroke-width': 1.5, rx: 3 }); if (label) el('text', { x: X(c) + w * C / 2, y: Y(r) + h * C / 2 + 4, 'font-size': 11, 'font-weight': 'bold', 'text-anchor': 'middle', fill: lc }, label); };
  block(4.5, 19, 1.3, 1.3, '#3a352d'); block(8, 22.5, 1.3, 1.3, '#3a352d'); block(18, 16.5, 1.3, 1.3, '#3a352d');
  block(14.3, 23, 1.6, 1.6, '#6b6f6a', 'rock');
  const crack = (c1, r, c2) => { let d = `M ${X(c1)} ${Y(r)}`; for (let c = c1 + .5, up = true; c <= c2; c += .5, up = !up) d += ` L ${X(c)} ${Y(r) + (up ? -8 : 8)}`; el('path', { d, fill: 'none', stroke: '#e0383e', 'stroke-width': 3.5 }); };
  crack(10, 21.3, 14); crack(2, 32.6, 6); crack(17, 32.2, 22); crack(9.5, 34.6, 14);
  el('text', { x: X(14.3), y: Y(21.2), 'font-size': 10, fill: '#b02020' }, 'crack A'); el('text', { x: X(6.3), y: Y(32.6), 'font-size': 10, fill: '#b02020' }, 'crack B');
  el('text', { x: X(22.2), y: Y(31.6), 'font-size': 10, fill: '#b02020', 'text-anchor': 'end' }, 'crack C'); el('text', { x: X(14.3), y: Y(34.7), 'font-size': 10, fill: '#b02020' }, 'crack D');
  const plinth = (c, r, label, awake) => { block(c, r, 4, 4, '#8a7a5c', ''); el('text', { x: X(c) + 2 * C, y: Y(r) + 2 * C - 4, 'font-size': 12, 'font-weight': 'bold', 'text-anchor': 'middle', fill: '#1b1712' }, label); el('text', { x: X(c) + 2 * C, y: Y(r) + 2 * C + 12, 'font-size': 10, 'text-anchor': 'middle', fill: '#1b1712' }, awake); };
  const P = window.PLINTHS || {};
  plinth(3, 22, 'GREEN SLAAD', P.slaad || 'awake'); plinth(17.5, 22.5, 'SKELESPIDER', P.spider || 'asleep: wakes End rd 20'); plinth(10, 29, 'REL. KILLER', P.killer || 'asleep: wakes End rd 22');
  block(23, 27, 1, 1.4, '#c9a227', '', '#000');
  el('rect', { x: X(1), y: Y(34), width: 3 * C, height: 3 * C, fill: 'rgba(122,46,110,.25)', stroke: '#7a2e6e', 'stroke-dasharray': '4 3' });
  el('text', { x: X(1) + 4, y: Y(33.8), 'font-size': 10, fill: '#7a2e6e' }, 'party start · stall');
  for (const m of marks) {
    const fill = m.kind === 'ranged' ? '#f2a33a' : m.kind === 'melee' ? '#5a6b7a' : m.kind === 'hero' ? '#3b82f6' : '#999';
    el('circle', { cx: X(m.c), cy: Y(m.r), r: 11, fill, stroke: '#111', 'stroke-width': 2 });
    el('text', { x: X(m.c), y: Y(m.r) + 4, 'font-size': 11, 'font-weight': 'bold', 'text-anchor': 'middle', fill: '#fff' }, m.t);
    if (m.reach) el('circle', { cx: X(m.c), cy: Y(m.r), r: m.reach * C, fill: 'none', stroke: fill, 'stroke-dasharray': '5 4', 'stroke-width': 1.5 });
  }
  // key
  const LX = X(25) + 18; let ly = Y(1) + 10;
  const key = (fill, t, d) => { el('circle', { cx: LX + 10, cy: ly, r: 10, fill, stroke: '#111', 'stroke-width': 2 }); el('text', { x: LX + 28, y: ly + 5, 'font-size': 14, fill: '#f3e6cc', 'font-family': 'Georgia' }, t); if (d) { ly += 18; el('text', { x: LX + 28, y: ly + 3, 'font-size': 12, fill: '#cfc2a8', 'font-family': 'Georgia' }, d); } ly += 30; };
  key('#5a6b7a', 'M · Frozen Dead, melee', 'moves 5″, strikes adjacent');
  key('#f2a33a', 'R · Frozen Dead archer', 'shoots a hero within 6″ it can see');
  return { key, el, X, Y, LX, get ly() { return ly; }, set ly(v) { ly = v; } };
};
