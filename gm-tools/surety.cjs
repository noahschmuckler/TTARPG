// Old Surety and his ioun stones (the Ledger Hall boss).
//   node gm-tools/surety.cjs ROOM bell [destroyed]   e.g. `bell red,black`. The party reaches the dais. Every colour shelf
//       NOT destroyed joins Old Surety as an orbiting stone: a doom shelf they slipped past keeps its damage, a colour
//       nobody picked arrives fresh. He rises with only those stones' powers.
//   node gm-tools/surety.cjs ROOM sync   after a stone is knocked down: strip its power from Old Surety.
const WebSocket = require('ws');
const [room, cmd, destroyedArg = ''] = process.argv.slice(2);
const PIN = process.env.PIN || '1234';
if (!room || !['bell', 'sync'].includes(cmd)) { console.log('usage: surety.cjs ROOM bell [red,black,...] | sync'); process.exit(1); }
const destroyed = destroyedArg.toLowerCase().split(',').map(x => x.trim()).filter(Boolean);

const STONES = [
  { prefix: 'Red Stack', key: 'enrage', power: 'Enrage', colour: 'red' , title: 'Arrears' },
  { prefix: 'Blue Stack', key: 'regen', power: 'Regenerate', colour: 'blue' , title: 'Compound Interest' },
  { prefix: 'Green Stack', key: 'summoner', power: 'Summoner', colour: 'green' , title: 'Liabilities' },
  { prefix: 'Black Stack', key: 'throes', power: 'Death Throes', colour: 'black' , title: 'Bad Debt' },
  { prefix: 'Gold Stack', key: 'thickhide', power: 'Thick Hide', colour: 'gold' , title: 'Assets' },
];
const BOSS = 'Old Surety';

const ws = new WebSocket(`${process.env.WS || 'wss://delvers-ledger.noah-schmuckler.workers.dev'}/ws?room=${room}`);
let S = null, rid = 0;
const pending = new Map();
const send = a => new Promise((res, rej) => { const id = ++rid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ t: 'act', action: a, rid: id })); });
const foes = () => Object.values(S.enemies);
const stoneFoe = s => foes().find(e => e.name.startsWith(s.prefix) && e.hp > 0);
const list = a => a.length ? a.join(', ') : 'nothing';

async function bell() {
  if (foes().some(e => e.name === BOSS)) throw new Error('Old Surety is already up; use sync');
  const bad = destroyed.filter(c => !STONES.some(s => s.colour === c));
  if (bad.length) throw new Error('unknown colour: ' + bad.join(', '));
  const joining = STONES.filter(s => !destroyed.includes(s.colour));
  const gone = STONES.filter(s => destroyed.includes(s.colour));
  await send({ type: 'spawn', etype: 'boss', count: 1, name: BOSS, scale: 5, abilities: joining.map(s => s.key),
    ability: 'Every unpaid debt, guaranteed. Knock down his orbiting books to strip their powers.' });
  const text = s => `Orbits Old Surety, granting him ${s.power}. Knock it down to strip it. Moves one square clockwise each End round.`;
  for (const s of joining) {
    const e = stoneFoe(s);
    if (e) await send({ type: 'editEnemy', enemyId: e.id, abilities: [], attacks: 1, damage: 120, ability: text(s) });
    else await send({ type: 'spawn', etype: 'elite', count: 1, name: `${s.prefix}: ${s.title}`, scale: 1, attacks: 1, damage: 120, abilities: [], ability: text(s) });
  }
  await send({ type: 'narrate', title: 'The Final Account',
    text: `The last folio clicks home, and every shelf in the house turns to face the dais. ${joining.length
      ? `The colour shelves still standing (${list(joining.map(s => s.colour))}) tear free and spiral up onto the dais, wheeling around a grey shape slumped before the Great Ledger.`
      : 'Not one shelf answers. The stacks are silent, and the grey shape on the dais looks very alone.'} It unfolds. And unfolds. And keeps unfolding, until a sad grey gnome the size of a house is looking down at you with eyes like wet ink. "I signed for all of it," says Old Surety. "Every debt in this house. Somebody has to pay." ${gone.length ? `(You destroyed ${list(gone.map(s => s.colour))}: he goes without ${list(gone.map(s => s.power))}.)` : ''}` });
  console.log(`Old Surety rises with: ${list(joining.map(s => s.power))}`);
}

async function sync() {
  const boss = foes().find(e => e.name === BOSS);
  if (!boss) throw new Error('Old Surety is not on the board');
  const alive = STONES.filter(stoneFoe);
  const keep = (boss.abilities || []).filter(k => !STONES.some(s => s.key === k) || alive.some(s => s.key === k));
  const lost = STONES.filter(s => (boss.abilities || []).includes(s.key) && !keep.includes(s.key));
  if (!lost.length) { console.log('nothing to strip; Old Surety has', list(boss.abilities || [])); return; }
  await send({ type: 'editEnemy', enemyId: boss.id, abilities: keep });
  for (const s of lost) await send({ type: 'narrate', title: `The ${s.colour} book falls`,
    text: `The ${s.colour} ledger drops out of orbit and bursts into loose pages. Old Surety flinches as if a line has been struck from his account. His ${s.power} is gone.` });
  console.log(`stripped ${list(lost.map(s => s.power))}; Old Surety now has ${list(keep)}`);
}

ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', role: 'gm', pin: PIN })));
ws.on('message', async m => {
  const d = JSON.parse(m);
  if (d.t === 'welcome' || d.t === 'state') {
    S = d.state;
    if (d.t === 'welcome') {
      try { await (cmd === 'bell' ? bell() : sync()); } catch (e) { console.log('FAIL', e.message); }
      setTimeout(() => process.exit(0), 400);
    }
    return;
  }
  if (d.rid && pending.has(d.rid)) { const p = pending.get(d.rid); pending.delete(d.rid); d.t === 'ok' ? p.res(d.result) : p.rej(new Error(d.msg)); }
});
ws.on('error', e => { console.error('ERR', e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); process.exit(1); }, 30000);
