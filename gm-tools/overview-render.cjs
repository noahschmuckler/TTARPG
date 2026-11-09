// Draws the whole Ledger Hall (24 x 36) with the Filing Stacks in their Hub layout.
//   node gm-tools/overview-render.cjs out.html
const fs = require('fs');
const D = require('./ledger-maze.json');
const out = process.argv[2] || 'overview.html';
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#1b1712;font-family:Georgia,serif;color:#f3e6cc}</style></head><body>
<svg id="s" xmlns="http://www.w3.org/2000/svg" width="1180" height="1230"></svg>
<script>
const {best, LIB, HUB, SLOTS} = ${JSON.stringify({ best: D.best, LIB: D.LIB, HUB: D.HUB, SLOTS: D.SLOTS })};
const s = document.getElementById('s'), NS = 'http://www.w3.org/2000/svg';
const el = (t, a, txt) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; s.appendChild(e); return e; };
const rot = (p, r) => { let g = p.map(x => x.split('')); for (let k = 0; k < r; k++) g = g.map((_, y) => g.map((_, x) => g[4 - x][y])); return g.map(a => a.join('')); };
const C = 30, X0 = 40, Y0 = 72, X = c => X0 + (c - 1) * C, Y = r => Y0 + (r - 1) * C;
const box = (c, r, w, h, fill, extra = {}) => el('rect', { x: X(c), y: Y(r), width: w * C, height: h * C, fill, ...extra });
const label = (c, r, t, size = 13, fill = '#fff8e8', w = 'bold', anchor = 'middle') => el('text', { x: X(c), y: Y(r), 'font-size': size, fill, 'font-weight': w, 'text-anchor': anchor, 'paint-order': 'stroke', stroke: '#1b1712', 'stroke-width': 3 }, t);
const dot = (c, r, fill, rad = 10, t = '') => { el('circle', { cx: X(c) + C / 2, cy: Y(r) + C / 2, r: rad, fill, stroke: '#1b1712', 'stroke-width': 2 }); if (t) el('text', { x: X(c) + C / 2, y: Y(r) + C / 2 + 4, 'font-size': 11, 'text-anchor': 'middle', fill: '#1b1712', 'font-weight': 'bold' }, t); };
const wall = (c1, r1, c2, r2) => el('line', { x1: X(c1), y1: Y(r1), x2: X(c2), y2: Y(r2), stroke: '#2a1d12', 'stroke-width': 6, 'stroke-linecap': 'square' });
const door = (c, r, w, h) => box(c, r, w, h, '#ffd84a', { stroke: '#2a1d12', 'stroke-width': 1.5 });
el('text', { x: X0, y: 28, 'font-size': 22, fill: '#f3e6cc', 'font-weight': 'bold' }, 'The Counting House of the Eighth Gate  ·  24 × 36 plank floor');
box(1, 1, 24, 36, '#8a6a45');
for (let r = 1; r <= 37; r++) el('line', { x1: X(1), x2: X(25), y1: Y(r), y2: Y(r), stroke: '#6d5236', 'stroke-width': 1 });
for (let c = 1; c <= 25; c++) el('line', { x1: X(c), x2: X(c), y1: Y(1), y2: Y(37), stroke: '#6d5236', 'stroke-width': .5, opacity: .5 });
wall(1, 1, 25, 1); wall(1, 1, 1, 37); wall(25, 1, 25, 37); wall(1, 37, 25, 37);
// top rooms: rows 1-6
box(1, 1, 8, 6, '#2d4a2a', { opacity: .5 }); box(17, 1, 8, 6, '#3b3b52', { opacity: .5 }); box(9, 1, 8, 6, '#5a3d6b', { opacity: .55 });
wall(9, 1, 9, 7); wall(17, 1, 17, 7); wall(1, 7, 25, 7);
label(4.5, 2.2, 'ARCHIVE OF BAD DEBTS', 11); dot(3, 3.5, '#7bd66b', 13, 'D'); label(3.5, 6.1, 'The Defaulted', 10, '#c8f5b8', 'normal'); box(6, 3, 1, 1, '#d4af37', { stroke: '#2a1d12', 'stroke-width': 2 }); label(6.5, 5.1, 'chest', 10, '#ffe9a8', 'normal');
label(21, 2.2, 'STRONGROOM', 11); box(18, 4, 1, 1, '#d4af37', { stroke: '#2a1d12', 'stroke-width': 2 }); box(23, 4, 1, 1, '#d4af37', { stroke: '#2a1d12', 'stroke-width': 2 }); label(21, 6.1, 'locked · key on the Collector', 10, '#ffe9a8', 'normal');
el('rect', { x: X(11), y: Y(2), width: 4 * C, height: 4 * C, fill: '#8d8f94', stroke: '#2a1d12', 'stroke-width': 3, rx: 26 });
el('text', { x: X(13), y: Y(3.9), 'font-size': 13, 'text-anchor': 'middle', fill: '#1b1712', 'font-weight': 'bold' }, 'OLD SURETY');
el('text', { x: X(13), y: Y(4.5), 'font-size': 10, 'text-anchor': 'middle', fill: '#1b1712' }, 'giant, 4×4');
for (const [c, r] of [[10, 1], [11, 1], [14, 1], [15, 1], [10, 2], [15, 2], [10, 5], [15, 5], [10, 6], [11, 6], [14, 6], [15, 6]]) el('circle', { cx: X(c) + C / 2, cy: Y(r) + C / 2, r: 6, fill: 'none', stroke: '#efd9ff', 'stroke-width': 1.5, 'stroke-dasharray': '2 2' });
box(9, 3, 1, 2, '#f5e6c8', { stroke: '#2a1d12', 'stroke-width': 1.5 }); label(9.5, 5.6, 'Ledger', 9, '#efd9ff', 'normal');
el('rect', { x: X(12), y: Y(1) - 8, width: 2 * C, height: 12, fill: '#d4af37', stroke: '#2a1d12', 'stroke-width': 2 }); label(13, 0.55, 'EXIT · the Final Door (three folio locks)', 12, '#ffe9a8');
label(13, 1.72, 'THE FINAL ACCOUNT', 9, '#efd9ff');
door(7, 6, 1, 1); door(12, 6, 1, 1);
// offices: rows 7-21
box(1, 7, 4, 15, '#5a2a2a', { opacity: .45 }); box(20, 7, 5, 15, '#5a2a50', { opacity: .45 });
wall(5, 7, 5, 22); wall(20, 7, 20, 22); wall(1, 22, 5, 22); wall(20, 22, 25, 22);
label(3, 9, "AUDITOR'S", 11); label(3, 9.55, 'OFFICE', 11); dot(2.5, 11, '#c76b6b', 14, 'A'); label(3, 13.2, 'Belashyrra', 10, '#ffd0d0', 'normal'); label(3, 19, 'folio I', 10, '#ffe9a8', 'normal');
label(22.5, 9, 'COLLECTIONS', 11); label(22.5, 9.55, 'WINDOW', 11); dot(22, 11, '#e77fd0', 14, 'C'); label(22.5, 13.2, 'daemonette', 10, '#ffd6f4', 'normal'); label(22.5, 19, 'folio II + key', 10, '#ffe9a8', 'normal');
door(4, 14, 1, 1); door(20, 14, 1, 1);
// the stacks: cols 5-19, rows 7-21, hub layout
const g = Array.from({ length: 15 }, () => Array(15).fill('#'));
SLOTS.forEach(([tx, ty], i) => { const t = rot(LIB[best.pat[i]], best.rot.hub[i]); for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) g[ty * 5 + y][tx * 5 + x] = t[y][x]; });
for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) g[5 + y][5 + x] = HUB[y][x];
for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) if (g[y][x] === '#') { const hub = x >= 5 && x <= 9 && y >= 5 && y <= 9; box(x + 5, y + 7, 1, 1, hub ? '#2f6f6a' : '#4a3220', { stroke: hub ? '#5fb3a9' : '#6b4a2e', 'stroke-width': .8 }); }
const L = 'ABCDEFGH';
SLOTS.forEach(([tx, ty], i) => { el('rect', { x: X(5 + tx * 5), y: Y(7 + ty * 5), width: 5 * C, height: 5 * C, fill: 'none', stroke: '#1b1712', 'stroke-width': 2.5 }); dot(5 + tx * 5, 7 + ty * 5, '#1b1712', 9); el('text', { x: X(5 + tx * 5) + C / 2, y: Y(7 + ty * 5) + C / 2 + 4, 'font-size': 11, 'text-anchor': 'middle', fill: '#f3e6cc', 'font-weight': 'bold' }, L[i]); });
el('rect', { x: X(10), y: Y(12), width: 5 * C, height: 5 * C, fill: 'none', stroke: '#9fe0d8', 'stroke-width': 3 });
for (const [c, r, f] of [[12, 12, '#e05252'], [10, 14, '#4a8fe0'], [14, 14, '#e0b84a']]) box(c, r, 1, 1, f, { stroke: '#fff', 'stroke-width': 2 });
box(12, 16, 1, 1, '#7a2a2a', { stroke: '#ff8080', 'stroke-width': 1.5 });
label(12.5, 14.65, 'HUB', 11, '#cfeee9');
// clerks' floor: rows 22-30
label(12.5, 22.85, "CLERKS' FLOOR", 14); el('rect', { x: X(12) + 4, y: Y(22) - 3, width: C - 8, height: 6, fill: '#ffd84a' });
for (const r of [24, 26, 28]) for (const c of [2, 5, 8, 15, 18, 21]) box(c, r, 2, 1, '#3a2414', { stroke: '#2a1d12', 'stroke-width': 1.5 });
for (const [c, r] of [[3, 25], [6, 27], [9, 25], [16, 27], [19, 25], [22, 27], [2, 29], [9, 29], [15, 25], [21, 29]]) dot(c, r, '#cfe8ff', 7);
label(12.5, 27, 'aisle', 10, '#fff8e8', 'normal');
// counter, entry
box(2, 31, 9, 1, '#5b3a1e', { stroke: '#2a1d12', 'stroke-width': 2 }); box(15, 31, 9, 1, '#5b3a1e', { stroke: '#2a1d12', 'stroke-width': 2 });
label(12.5, 32.65, 'counter flap', 10, '#fff8e8', 'normal'); dot(9, 31, '#d4af37', 8); label(9.5, 30.75, 'bell', 10, '#ffe9a8', 'normal');
box(16, 31, 2, 1, '#f5e6c8', { stroke: '#2a1d12' }); label(17, 30.75, 'contract', 10, '#ffe9a8', 'normal'); label(6.5, 32.2, 'FRONT COUNTER', 12);
for (let i = 0; i < 3; i++) box(2, 33 + i, 5, .5, '#5b3a1e'); label(4.5, 36.6, 'waiting benches', 10, '#fff8e8', 'normal');
box(8, 33, 1, 1, '#c0392b', { stroke: '#2a1d12' }); label(8.5, 35.3, 'take-a-number', 9, '#fff8e8', 'normal');
el('rect', { x: X(19), y: Y(33), width: 4 * C, height: 3 * C, fill: '#7a2e6e', stroke: '#d4af37', 'stroke-width': 2, rx: 6 }); label(21, 34.4, "RAKSHASA'S", 11, '#ffe9a8'); label(21, 34.95, 'STALL', 11, '#ffe9a8');
el('rect', { x: X(11), y: Y(37) - 6, width: 4 * C, height: 12, fill: '#4fb3a9', stroke: '#2a1d12', 'stroke-width': 2 }); label(13, 37.75, 'ENTRANCE · the Eighth Gate (up from the Kraken)', 12, '#a8fff2');
for (let r = 1; r <= 36; r++) el('text', { x: X0 - 8, y: Y(r) + 19, 'font-size': 10, 'text-anchor': 'end', fill: '#c9b48a' }, r);
// key
let ly = 90; const LX = 790;
const t = (txt, size = 13, fill = '#e8d9bd', w = 'normal') => { el('text', { x: LX, y: ly, 'font-size': size, fill, 'font-weight': w }, txt); ly += size + 8; };
t('Order of play', 17, '#ffe9a8', 'bold');
['1  Front Counter: safe. Recap, contract, stall.', '2  Through the counter flap: the clerks rise.', '3  The Filing Stacks: a 15×15 maze of eight', '    5×5 tiles round a fixed hub (teal).', '4  Pick a colour exit; turn the listed tiles.', '    Maze, then a 1-wide doom hall that seals.', '5  Beat the doom shelf (or slip past it),', '    then the elite behind the door, for a folio.', '6  Back to the hub, turn tiles back. Repeat.', '7  Third folio: the way to the steps opens.', '    Old Surety + every colour not destroyed.'].forEach(x => t(x, 12.5));
ly += 8; t('Exits lead across the hall, not next door', 15, '#ffe9a8', 'bold');
['North (red here) → the Archive (Defaulted)', 'West (blue here) → the Collector', 'East (gold here) → the Auditor', 'Colours are reshuffled at each return.'].forEach(x => t(x, 12.5));
ly += 8; t('Doors', 15, '#ffe9a8', 'bold'); t('Yellow squares are doors. They stay shut', 12.5); t('unless a doom hall leads to them.', 12.5);
</script></body></html>`;
fs.writeFileSync(out, html); console.log('wrote', out);
