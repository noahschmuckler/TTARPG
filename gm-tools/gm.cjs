// GM helper: node gm.cjs ROOM '<json action or array of actions>' | @scene   (no actions = just print state)
// Actions may use "$Name" for a hero's id (e.g. "charId":"$Saile") and "$foe:Name" for an enemy id.
const WebSocket = require('ws');
const [room, raw] = process.argv.slice(2);
const PIN = process.env.PIN || '1234';
let actions = !raw ? [] : raw.startsWith('@') ? require('./scenes.json')[raw.slice(1)] : JSON.parse(raw); // '@name' runs a preset from scenes.json
if (!actions) { console.log('no such scene'); process.exit(1); }
if (!Array.isArray(actions)) actions = [actions];
const ws = new WebSocket(`${process.env.WS || 'wss://delvers-ledger.noah-schmuckler.workers.dev'}/ws?room=${room}`);
let S = null, rid = 0;
const pending = new Map();
const send = a => new Promise((res, rej) => { const id = ++rid; pending.set(id, { res, rej }); ws.send(JSON.stringify({ t: 'act', action: a, rid: id })); });
function resolveIds(v) {
  if (typeof v === 'string' && v.startsWith('$foe:')) { const n = v.slice(5).toLowerCase(); const e = Object.values(S.enemies).find(e => e.name.toLowerCase().startsWith(n)); if (!e) throw new Error('no foe ' + n); return e.id; }
  if (typeof v === 'string' && v.startsWith('$')) { const n = v.slice(1).toLowerCase(); const c = Object.values(S.characters).find(c => c.name.toLowerCase().startsWith(n)); if (!c) throw new Error('no hero ' + n); return c.id; }
  if (Array.isArray(v)) return v.map(resolveIds);
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveIds(x)]));
  return v;
}
function summary() {
  console.log(`round ${S.round}`);
  for (const id of S.order) { const c = S.characters[id]; console.log(`  hero ${c.name} (${c.cls}) hp ${c.hp} energy ${c.energy} ward ${c.ward || 0} gear ${Object.values(c.equipped || {}).filter(Boolean).length} bag ${(c.bag || []).length}`); }
  for (const e of Object.values(S.enemies)) console.log(`  foe ${e.type} "${e.name}" ${e.hp}/${e.maxHp} armor ${e.armor} ${e.attacks}x${e.damage} [${(e.abilities || []).join(',')}] on ${e.target ? S.characters[e.target]?.name : '-'}`);
  const loot = Object.values(S.loot || {}); if (loot.length) console.log(`  loot cards: ${loot.length} (${loot.map(l => l.card + ':' + l.label).join(', ')})`);
  console.log('  log:', S.log.slice(0, 6).map(l => l.text).join(' | '));
}
ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', role: 'gm', pin: PIN })));
ws.on('message', async m => {
  const d = JSON.parse(m);
  if (d.t === 'welcome' || d.t === 'state') { S = d.state; if (d.t === 'welcome') run(); return; }
  if (d.rid && pending.has(d.rid)) { const p = pending.get(d.rid); pending.delete(d.rid); d.t === 'ok' ? p.res(d.result) : p.rej(new Error(d.msg)); return; }
  if (d.t === 'error') { console.error('ERROR', d.msg); if (d.fatal) process.exit(1); }
});
async function run() {
  for (const a of actions) {
    try { const r = await send(resolveIds(a)); console.log('ok', a.type, r ? JSON.stringify(r).slice(0, 400) : ''); }
    catch (e) { console.log('FAIL', a.type, e.message); }
    await new Promise(r => setTimeout(r, 250));
  }
  await new Promise(r => setTimeout(r, 400));
  summary(); process.exit(0);
}
ws.on('error', e => { console.error('ERR', e.message); process.exit(1); });
setTimeout(() => { console.log('timeout'); process.exit(1); }, 30000);
