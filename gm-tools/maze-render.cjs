// Draws gm-tools/ledger-maze.json as an HTML sheet: six scenes, the eight tiles to build, and the turn table.
//   node gm-tools/maze-render.cjs out.html
const fs = require('fs');
const D = require('./ledger-maze.json');
const { best, detail, LIB, HUB, SLOTS } = D;
const out = process.argv[2] || 'maze.html';
const LETTERS = 'ABCDEFGH';
const SCN = [
  { key: 'lure', title: '1 · The Lure', sub: 'One gap in the south wall leads from the clerks\' floor into the hub.', open: ['S'] },
  { key: 'hub', title: '2 · The Hub', sub: 'Tile G turns behind them. Three exits, each a colour shelf.', open: [] },
  { key: 'A', title: '3 · North exit → the Archive', sub: '', open: ['N'] },
  { key: 'B', title: '4 · West exit → the Collector', sub: '', open: ['W'] },
  { key: 'C', title: '5 · East exit → the Auditor', sub: '', open: ['E'] },
  { key: 'final', title: '6 · The Final Account', sub: 'Three folios in: one tile turns and opens the way to the steps.', open: ['N'] },
];
for (const s of SCN) if (['A', 'B', 'C'].includes(s.key)) { const d = detail[s.key]; s.sub = `Approach ${d.L} squares, doom hall ${d.K}. ${d.D} dead ends, ${d.F} squares of false trail.`; s.path = d.path; s.K = d.K; }
const data = { best, LIB, HUB, SLOTS, SCN, LETTERS };
const html = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;background:#1b1712;font-family:Georgia,serif;color:#f3e6cc}</style></head><body>
<svg id="s" xmlns="http://www.w3.org/2000/svg" width="1560" height="1700"></svg>
<script>
const {best, LIB, HUB, SLOTS, SCN, LETTERS} = ${JSON.stringify(data)};
const s = document.getElementById('s'), NS = 'http://www.w3.org/2000/svg';
const el = (t, a, txt, p = s) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (txt != null) e.textContent = txt; p.appendChild(e); return e; };
const rot = (p, r) => { let g = p.map(x => x.split('')); for (let k = 0; k < r; k++) g = g.map((_, y) => g.map((_, x) => g[4 - x][y])); return g.map(a => a.join('')); };
const EXIT = { N: [7, 5], W: [5, 7], E: [9, 7], S: [7, 9] };
const COL = { red: '#e05252', blue: '#4a8fe0', green: '#4caf50', black: '#333', gold: '#e0b84a' };
const DOORS = { archive: [2, -1], steps: [7, -1], collector: [15, 7], auditor: [-1, 7], lure: [7, 15] };
const DOOR_OF = { A: 'archive', B: 'collector', C: 'auditor', final: 'steps', lure: 'lure' };
el('text', { x: 30, y: 36, 'font-size': 27, fill: '#f3e6cc', 'font-weight': 'bold' }, 'The Filing Stacks: eight tiles that turn');
const defs = el('defs', {}); defs.innerHTML = '<linearGradient id="rb" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e05252"/><stop offset=".3" stop-color="#e0b84a"/><stop offset=".55" stop-color="#4caf50"/><stop offset=".8" stop-color="#4a8fe0"/><stop offset="1" stop-color="#555"/></linearGradient>';
function panel(sc, ox, oy) {
  const C = 24, g = el('g', { transform: 'translate(' + ox + ',' + oy + ')' });
  const X = x => (x + 1) * C, Y = y => (y + 1) * C + 44;
  el('text', { x: 0, y: 16, 'font-size': 17, fill: '#ffe9a8', 'font-weight': 'bold' }, sc.title, g);
  el('text', { x: 0, y: 34, 'font-size': 11.5, fill: '#e8d9bd' }, sc.sub, g);
  // surroundings: one ring of building around the 15x15 maze
  el('rect', { x: 0, y: Y(-1), width: 17 * C, height: 17 * C, fill: '#2a1d12' }, null, g);
  el('rect', { x: 0, y: Y(15), width: 17 * C, height: C, fill: '#a58c64' }, null, g);
  el('text', { x: X(11), y: Y(15) + 16, 'font-size': 11, 'text-anchor': 'middle', fill: '#2a1d12' }, "clerks' floor (way in)", g);
  el('text', { x: X(-1) + 15, y: Y(11) + 12, 'font-size': 10, fill: '#ffd0d0', 'text-anchor': 'middle', transform: 'rotate(-90 ' + (X(-1) + 15) + ' ' + (Y(11) + 12) + ')' }, 'AUDITOR', g);
  el('text', { x: X(15) + 9, y: Y(11) + 12, 'font-size': 10, fill: '#ffd6f4', 'text-anchor': 'middle', transform: 'rotate(90 ' + (X(15) + 9) + ' ' + (Y(11) + 12) + ')' }, 'COLLECTOR', g);
  el('text', { x: X(0), y: Y(-1) + 16, 'font-size': 10, fill: '#c8f5b8' }, 'ARCHIVE', g);
  el('text', { x: X(8.3), y: Y(-1) + 16, 'font-size': 10, fill: '#efd9ff' }, 'DAIS', g);
  const r = best.rot[sc.key], hubR = best.rot.hub;
  const grid = Array.from({ length: 15 }, () => Array(15).fill('#'));
  SLOTS.forEach(([tx, ty], i) => { const t = rot(LIB[best.pat[i]], r[i]); for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) grid[ty * 5 + y][tx * 5 + x] = t[y][x]; });
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) grid[5 + y][5 + x] = HUB[y][x];
  const hall = new Set((sc.path || []).slice(-(sc.K || 0)).map(([x, y]) => x + ',' + y));
  for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
    const wall = grid[y][x] === '#', hub = x >= 5 && x <= 9 && y >= 5 && y <= 9;
    el('rect', { x: X(x), y: Y(y), width: C, height: C, fill: wall ? (hub ? '#2f6f6a' : '#4a3220') : hall.has(x + ',' + y) ? '#a8443a' : '#8a6a45', stroke: wall ? (hub ? '#5fb3a9' : '#6b4a2e') : '#6d5236', 'stroke-width': .8 }, null, g);
  }
  // doors
  for (const [k, [x, y]] of Object.entries(DOORS)) { const live = DOOR_OF[sc.key] === k; el('rect', { x: X(x) + 4, y: Y(y) + 4, width: C - 8, height: C - 8, fill: live ? '#ffd84a' : '#6b5d48', stroke: live ? '#fff' : 'none', 'stroke-width': 2 }, null, g); }
  // tile borders, letters, turned tiles
  SLOTS.forEach(([tx, ty], i) => {
    const turned = sc.key !== 'hub' && sc.key !== 'lure' ? (r[i] - hubR[i] + 4) % 4 : sc.key === 'lure' ? (r[i] - hubR[i] + 4) % 4 : 0;
    el('rect', { x: X(tx * 5), y: Y(ty * 5), width: 5 * C, height: 5 * C, fill: 'none', stroke: turned ? '#ffd84a' : '#1b1712', 'stroke-width': turned ? 4 : 2.5 }, null, g);
    el('circle', { cx: X(tx * 5) + 12, cy: Y(ty * 5) + 12, r: 10, fill: turned ? '#ffd84a' : '#1b1712', stroke: '#f3e6cc', 'stroke-width': 1 }, null, g);
    el('text', { x: X(tx * 5) + 12, y: Y(ty * 5) + 16, 'font-size': 12, 'font-weight': 'bold', 'text-anchor': 'middle', fill: turned ? '#1b1712' : '#f3e6cc' }, LETTERS[i], g);
    if (turned) el('text', { x: X(tx * 5) + 26, y: Y(ty * 5) + 16, 'font-size': 11, 'font-weight': 'bold', fill: '#ffd84a', 'paint-order': 'stroke', stroke: '#1b1712', 'stroke-width': 3 }, '↻' + turned * 90 + '°', g);
  });
  el('rect', { x: X(5), y: Y(5), width: 5 * C, height: 5 * C, fill: 'none', stroke: '#9fe0d8', 'stroke-width': 2.5 }, null, g);
  el('text', { x: X(7) + C / 2, y: Y(7) + C / 2 + 4, 'font-size': 10, 'text-anchor': 'middle', fill: '#cfeee9' }, 'HUB', g);
  // exits
  const colours = { N: 'red', W: 'blue', E: 'gold' };
  for (const k of ['N', 'W', 'E']) { const [x, y] = EXIT[k];
    if (sc.open.includes(k)) el('rect', { x: X(x) + 3, y: Y(y) + 3, width: C - 6, height: C - 6, fill: 'none', stroke: '#fff', 'stroke-width': 1.5, 'stroke-dasharray': '3 2' }, null, g);
    else el('rect', { x: X(x) + 2, y: Y(y) + 2, width: C - 4, height: C - 4, fill: sc.key === 'final' ? '#999' : COL[colours[k]], stroke: '#fff', 'stroke-width': 2 }, null, g); }
  if (!sc.open.includes('S')) { const [x, y] = EXIT.S; el('rect', { x: X(x) + 2, y: Y(y) + 2, width: C - 4, height: C - 4, fill: '#7a2a2a', stroke: '#ff8080', 'stroke-width': 1.5 }, null, g); }
  // path
  let path = sc.path;
  if (!path && sc.key !== 'hub') path = bfsPath(grid, sc.key === 'lure' ? [7, 14] : [7, 7], sc.key === 'lure' ? [7, 7] : [7, 0], sc.open);
  if (path) {
    const pts = path.map(([x, y]) => (X(x) + C / 2) + ',' + (Y(y) + C / 2));
    if (sc.key === 'lure') pts.unshift((X(7) + C / 2) + ',' + (Y(15) + C / 2));
    else { const [dx, dy] = DOORS[DOOR_OF[sc.key]]; pts.push((X(dx) + C / 2) + ',' + (Y(dy) + C / 2)); }
    el('polyline', { points: pts.join(' '), fill: 'none', stroke: '#fff3b0', 'stroke-width': 3, 'stroke-dasharray': '6 4', 'stroke-linecap': 'round' }, null, g);
  }
  if (sc.K) { const p = sc.path, first = p[p.length - sc.K], prev = p[p.length - sc.K - 1], last = p[p.length - 1];
    const bx = Math.max(first[0], prev[0]), by = Math.max(first[1], prev[1]);
    if (first[0] !== prev[0]) el('line', { x1: X(bx), y1: Y(first[1]), x2: X(bx), y2: Y(first[1]) + C, stroke: '#ff3b3b', 'stroke-width': 6, 'stroke-linecap': 'round' }, null, g);
    else el('line', { x1: X(first[0]), y1: Y(by), x2: X(first[0]) + C, y2: Y(by), stroke: '#ff3b3b', 'stroke-width': 6, 'stroke-linecap': 'round' }, null, g);
    el('rect', { x: X(last[0]) + 1, y: Y(last[1]) + 1, width: C - 2, height: C - 2, fill: 'url(#rb)', stroke: '#fff', 'stroke-width': 2.5 }, null, g);
    el('text', { x: X(last[0]) + C / 2, y: Y(last[1]) + C / 2 + 4, 'font-size': 12, 'font-weight': 'bold', 'text-anchor': 'middle', fill: '#000' }, '!', g); }
}
function bfsPath(grid, from, to, open) {
  const key = (x, y) => y * 15 + x, prev = new Map([[key(...from), -1]]), q = [from];
  while (q.length) { const [x, y] = q.shift(); if (x === to[0] && y === to[1]) { const p = []; let k = key(x, y); while (k !== -1) { p.push([k % 15, Math.floor(k / 15)]); k = prev.get(k); } return p.reverse(); }
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + a, ny = y + b; if (nx < 0 || ny < 0 || nx > 14 || ny > 14) continue;
      const exitClosed = Object.entries(EXIT).some(([k, [ex, ey]]) => ex === nx && ey === ny && !open.includes(k));
      if (grid[ny][nx] === '.' && !exitClosed && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), key(x, y)); q.push([nx, ny]); } } }
  return null;
}
SCN.forEach((sc, i) => panel(sc, 30 + (i % 3) * 510, 60 + Math.floor(i / 3) * 520));
// ---- the tiles to build, and the turn table
(function () {
  const oy = 1110, g = el('g', { transform: 'translate(30,' + oy + ')' });
  el('text', { x: 0, y: 0, 'font-size': 19, fill: '#ffe9a8', 'font-weight': 'bold' }, 'Build these eight tiles (shown as placed for the Hub; north is up)', g);
  const C = 16;
  SLOTS.forEach((_, i) => {
    const ox = i * 122, t = rot(LIB[best.pat[i]], best.rot.hub[i]);
    let n = 0;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) { const w = t[y][x] === '#'; if (w) n++; el('rect', { x: ox + x * C, y: 18 + y * C, width: C, height: C, fill: w ? '#4a3220' : '#8a6a45', stroke: '#6d5236', 'stroke-width': .6 }, null, g); }
    el('rect', { x: ox, y: 18, width: 5 * C, height: 5 * C, fill: 'none', stroke: '#f3e6cc', 'stroke-width': 1.5 }, null, g);
    el('polygon', { points: (ox + 2.5 * C - 5) + ',14 ' + (ox + 2.5 * C + 5) + ',14 ' + (ox + 2.5 * C) + ',8', fill: '#ffd84a' }, null, g);
    el('text', { x: ox + 5 * C + 8, y: 40, 'font-size': 22, 'font-weight': 'bold', fill: '#ffe9a8' }, LETTERS[i], g);
    el('text', { x: ox + 5 * C + 8, y: 58, 'font-size': 10, fill: '#d6c4a0' }, n + ' shelf', g);
    el('text', { x: ox + 5 * C + 8, y: 70, 'font-size': 10, fill: '#d6c4a0' }, 'squares', g);
  });
  const rows = [['From the Hub, to start…', null], ['North exit (Archive)', 'A'], ['West exit (Collector)', 'B'], ['East exit (Auditor)', 'C'], ['The Final Account', 'final'], ['Lure → Hub (seal)', 'lure']];
  let y = 140;
  el('text', { x: 0, y, 'font-size': 15, fill: '#ffe9a8', 'font-weight': 'bold' }, 'Turn table: clockwise turns from the Hub layout. Turn them back after each run.', g); y += 26;
  for (const [label, key] of rows.slice(1)) {
    const turns = [];
    SLOTS.forEach((_, i) => { const a = key === 'lure' ? (best.rot.hub[i] - best.rot.lure[i] + 4) % 4 : (best.rot[key][i] - best.rot.hub[i] + 4) % 4; if (a) turns.push(LETTERS[i] + ' ↻' + a * 90 + '°'); });
    el('text', { x: 0, y, 'font-size': 14, fill: '#f3e6cc', 'font-weight': 'bold' }, label, g);
    el('text', { x: 230, y, 'font-size': 14, fill: '#ffd84a' }, turns.join('     ') || 'nothing', g); y += 24;
  }
})();
</script></body></html>`;
fs.writeFileSync(out, html);
console.log('wrote', out);
