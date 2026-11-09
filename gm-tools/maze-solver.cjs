// Searches for rotating shelf tiles for the Filing Stacks (Ledger Hall).
// The maze is a 3x3 grid of 5x5 tiles; the centre tile is the hub and never moves. Each scene (lure, hub, three runs,
// final) is the same eight tiles at different rotations. Writes gm-tools/ledger-maze.json.
//   node gm-tools/maze-solver.cjs [iterations] [seed]
const fs = require('fs');
const ITER = +(process.argv[2] || 400000);
let seed = +(process.argv[3] || 7);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const ri = n => Math.floor(rnd() * n);

// Tile library: '#' shelf, '.' floor. Ports are the middle of each edge: (2,0) (4,2) (2,4) (0,2).
const LIB = {
  bar:   ['.#.#.', '.#.#.', '.#...', '.#.#.', '.#.#.'],
  hook:  ['...#.', '.#.#.', '.#...', '.###.', '...#.'],
  comb:  ['.....', '##.##', '.#.#.', '.#.#.', '.###.'],
  ell:   ['.#.##', '.#...', '.####', '.....', '##.##'],
  zig:   ['##.#.', '...#.', '.###.', '.#...', '.#.##'],
  tee:   ['.#.#.', '.#.#.', '.....', '####.', '.....'],
};
const HUB = ['##.##', '#...#', '.....', '#...#', '##.##'];
const KEYS = Object.keys(LIB);
const rot = (p, r) => { let g = p.map(s => s.split('')); for (let k = 0; k < r; k++) g = g.map((_, y) => g.map((_, x) => g[4 - x][y])); return g.map(a => a.join('')); };

// Tile slots (tx,ty), excluding the hub at (1,1).
const SLOTS = [[0, 0], [1, 0], [2, 0], [0, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
const SMID = 6; // slot index of the south-middle tile (the lure tile)
const N = 15;
const EXIT = { N: [7, 5], W: [5, 7], E: [9, 7], S: [7, 9] };
// Doors sit just outside the maze, next to a border cell.
const DOOR = { auditor: { cell: [0, 7], out: [-1, 7] }, collector: { cell: [14, 7], out: [15, 7] }, archive: { cell: [2, 0], out: [2, -1] }, steps: { cell: [7, 0], out: [7, -1] }, lure: { cell: [7, 14], out: [7, 15] } };

function build(pat, rots, open) {
  const g = Array.from({ length: N }, () => Array(N).fill('#'));
  SLOTS.forEach(([tx, ty], i) => { const t = rot(LIB[pat[i]], rots[i]); for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) g[ty * 5 + y][tx * 5 + x] = t[y][x]; });
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) g[5 + y][5 + x] = HUB[y][x];
  for (const k of ['N', 'W', 'E', 'S']) if (!open.includes(k)) { const [x, y] = EXIT[k]; g[y][x] = '#'; }
  return g;
}
const inb = (x, y) => x >= 0 && y >= 0 && x < N && y < N;
const D4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function bfs(g, from, door) {
  const key = (x, y) => y * N + x, prev = new Map([[key(...from), -1]]), q = [from];
  const [dx, dy] = door ? door.cell : [-9, -9];
  let found = false;
  while (q.length) { const [x, y] = q.shift(); if (x === dx && y === dy) { found = true; break; }
    for (const [a, b] of D4) { const nx = x + a, ny = y + b; if (inb(nx, ny) && g[ny][nx] === '.' && !prev.has(key(nx, ny))) { prev.set(key(nx, ny), key(x, y)); q.push([nx, ny]); } } }
  const reach = prev;
  if (!door || !found) return { found, reach };
  const path = []; let k = key(dx, dy); while (k !== -1) { path.push([k % N, Math.floor(k / N)]); k = prev.get(k); }
  return { found, reach, path: path.reverse() };
}
const nbrOpen = (g, x, y, door) => D4.filter(([a, b]) => { const nx = x + a, ny = y + b; if (door && nx === door.out[0] && ny === door.out[1]) return true; return inb(nx, ny) && g[ny][nx] === '.'; }).length;

function runScore(g, door) {
  const r = bfs(g, [7, 7], door);
  if (!r.found) return { s: -1000 };
  const p = r.path; let K = 0;
  for (let i = p.length - 1; i >= 0; i--) { const [x, y] = p[i]; if (nbrOpen(g, x, y, door) === 2) K++; else break; }
  const L = p.length - K;
  const onPath = new Set(p.map(([x, y]) => y * N + x));
  let F = 0, D = 0; for (const k of r.reach.keys()) if (!onPath.has(k)) { F++; const x = k % N, y = Math.floor(k / N); if (nbrOpen(g, x, y) === 1) D++; }
  let s = 0;
  s += K < 10 ? -(10 - K) * 30 : 0; s += Math.min(K, 16) * 3;
  s += L < 8 ? -(8 - L) * 10 : Math.min(L, 24);
  s += 0.5 * Math.min(F, 60) + 4 * Math.min(D, 8);
  return { s, K, L, F, D, path: p };
}

const SCENES = ['lure', 'hub', 'A', 'B', 'C', 'final'];
function evaluate(st, detail) {
  let total = 0; const out = {};
  // lure: from the clerks' floor through the south tile into the hub
  const gl = build(st.pat, st.rot.lure, ['S']);
  const lr = bfs(gl, DOOR.lure.cell, { cell: [7, 7] });
  total += lr.found ? 0 : -1000;
  // hub: the south tile turns and seals them in
  const gh = build(st.pat, st.rot.hub, ['S']);
  const hr = bfs(gh, [7, 7]);
  const sealed = [...hr.reach.keys()].every(k => { const x = k % N, y = Math.floor(k / N); return x >= 5 && x <= 9 && y >= 5 && y <= 9; });
  total += sealed ? 0 : -500;
  for (let i = 0; i < 8; i++) if (i !== SMID && st.rot.hub[i] !== st.rot.lure[i]) total -= 50;
  // three runs, one per exit, to the doors in st.map
  for (const [scene, exit] of [['A', 'N'], ['B', 'W'], ['C', 'E']]) {
    const g = build(st.pat, st.rot[scene], [exit]);
    const r = runScore(g, DOOR[st.map[exit]]);
    total += r.s; let ch = 0; for (let i = 0; i < 8; i++) if (st.rot[scene][i] !== st.rot.hub[i]) ch++; total -= 6 * ch;
    if (detail) out[scene] = { ...r, changes: ch, exit, door: st.map[exit] };
  }
  const gf = build(st.pat, st.rot.final, ['N']);
  const fr = bfs(gf, [7, 7], DOOR.steps);
  total += fr.found ? 0 : -1000; let fch = 0; for (let i = 0; i < 8; i++) if (st.rot.final[i] !== st.rot.hub[i]) fch++; total -= 4 * fch;
  if (detail) Object.assign(out, { lure: lr.found, sealed, final: fr.found, finalChanges: fch });
  return detail ? { total, ...out } : total;
}

const PERMS = [['auditor', 'collector', 'archive'], ['auditor', 'archive', 'collector'], ['collector', 'auditor', 'archive'], ['collector', 'archive', 'auditor'], ['archive', 'auditor', 'collector'], ['archive', 'collector', 'auditor']];
const mkMap = p => ({ N: p[0], W: p[1], E: p[2] });
function randomState() {
  const rot = {}; for (const s of SCENES) rot[s] = SLOTS.map(() => ri(4));
  return { pat: SLOTS.map(() => KEYS[ri(KEYS.length)]), rot, map: mkMap(PERMS[ri(6)]) };
}
const clone = st => JSON.parse(JSON.stringify(st));
function mutate(st) {
  const n = clone(st), m = ri(10);
  if (m === 0) n.pat[ri(8)] = KEYS[ri(KEYS.length)];
  else if (m === 1) n.map = mkMap(PERMS[ri(6)]);
  else if (m === 2) { const i = ri(8), v = ri(4); for (const s of SCENES) n.rot[s][i] = v; }
  else { const s = SCENES[ri(SCENES.length)]; n.rot[s][ri(8)] = ri(4); }
  return n;
}
let best = null, bestScore = -Infinity;
for (let restart = 0; restart < 6; restart++) {
  let cur = randomState(), cs = evaluate(cur);
  for (let it = 0; it < ITER / 6; it++) {
    const T = 40 * (1 - it / (ITER / 6)) + 0.5;
    const nx = mutate(cur), ns = evaluate(nx);
    if (ns >= cs || rnd() < Math.exp((ns - cs) / T)) { cur = nx; cs = ns; }
    if (cs > bestScore) { best = clone(cur); bestScore = cs; }
  }
}
const d = evaluate(best, true);
console.log('score', bestScore.toFixed(1), 'lure', d.lure, 'sealed', d.sealed, 'final', d.final, 'final changes', d.finalChanges);
for (const s of ['A', 'B', 'C']) console.log(s, d[s].exit, '->', d[s].door, `hall ${d[s].K} approach ${d[s].L} fake squares ${d[s].F} dead ends ${d[s].D} tiles turned ${d[s].changes}`);
console.log('patterns', best.pat.join(' '));
fs.writeFileSync(__dirname + '/ledger-maze.json', JSON.stringify({ best, detail: d, LIB, HUB, SLOTS, EXIT, DOOR }, null, 1));
