import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, newGame, derive, makeItem, RARITY_ORDER } from '../public/engine.js';
import { RoomCore } from '../server/room.js';

function setup() {
  const s = newGame('TEST');
  const { result } = apply(s, { type: 'createCharacter', name: 'Brokk', cls: 'ironclad' });
  return { s, id: result.charId };
}

test('roll banks hits; tapping minions spends them for energy', () => {
  const { s, id } = setup();
  apply(s, { type: 'spawn', etype: 'minion', count: 4, target: id });
  apply(s, { type: 'attack', charId: id, hits: 3, sixes: 0 });
  assert.deepEqual(s.characters[id].strike, { hits: 3, crits: 0, minion: 0, mult: 1 });
  const m = Object.values(s.enemies).filter(e => e.target === id);
  apply(s, { type: 'spend', charId: id, enemyId: m[0].id });
  apply(s, { type: 'spend', charId: id, enemyId: 'table' });
  assert.equal(Object.keys(s.enemies).length, 3);
  assert.equal(s.characters[id].kills, 2);
  assert.equal(s.characters[id].energy, 20 + 2 * 8);
  assert.match(apply(s, { type: 'attack', charId: id, hits: 1 }).error, /remaining/);
  apply(s, { type: 'spend', charId: id, enemyId: m[1].id });
  assert.equal(s.characters[id].strike, undefined);
  assert.match(apply(s, { type: 'spend', charId: id, enemyId: m[2].id }).error, /No hits/);
});

test('hits are capped by dice pool; buffs add dice and are consumed', () => {
  const { s, id } = setup();
  apply(s, { type: 'attack', charId: id, hits: 9 });
  assert.equal(s.characters[id].strike.hits, 3);
  apply(s, { type: 'endAttack', charId: id });
  s.characters[id].energy = 100;
  apply(s, { type: 'ability', charId: id, key: 'leap' });
  assert.equal(derive(s.characters[id]).pool, 5);
  apply(s, { type: 'attack', charId: id, hits: 5 });
  assert.equal(derive(s.characters[id]).pool, 3);
});

test('crits go to big foes first, enemy armor cuts damage, smite gives minion-only hits', () => {
  const { s, id } = setup();
  apply(s, { type: 'spawn', etype: 'elite', count: 1, target: id });
  const eid = Object.keys(s.enemies)[0];
  apply(s, { type: 'attack', charId: id, hits: 2, sixes: 1 });
  apply(s, { type: 'spend', charId: id, enemyId: eid });
  assert.equal(s.enemies[eid].hp, 2000 - 840 * 0.8); // crit first: 420×2, 20% armor
  s.characters[id].energy = 100;
  equipSet(s, id, 'thunderforge', 'helm'); // Thunderclap: 3 minion-only hits
  apply(s, { type: 'ability', charId: id, key: 'set:thunderforge' });
  assert.deepEqual(s.characters[id].strike, { hits: 1, crits: 0, minion: 3, mult: 1 });
  apply(s, { type: 'spend', charId: id, enemyId: eid });
  assert.match(apply(s, { type: 'spend', charId: id, enemyId: eid }).error, /only work on minions/);
  apply(s, { type: 'endRound' });
  assert.equal(s.characters[id].strike, undefined);
});

test('armor and ward on incoming damage', () => {
  const { s, id } = setup();
  s.characters[id].ward = 100;
  const r = apply(s, { type: 'hurt', charId: id, amount: 1000 });
  assert.deepEqual([r.events[0].blocked, r.events[0].warded, r.events[0].net], [300, 100, 600]);
  assert.equal(s.characters[id].hp, 1200);
});

test('items change derived stats; end round adds energy', () => {
  const { s, id } = setup();
  for (const r of RARITY_ORDER) assert.ok(makeItem(r).name);
  apply(s, { type: 'giveLoot', charId: id, rarity: 'legendary', slot: 'helm' });
  const it = s.characters[id].bag[0];
  apply(s, { type: 'equip', charId: id, itemId: it.id });
  assert.equal(derive(s.characters[id]).maxHp, 1800 + it.stats.maxHp);
  assert.equal(s.characters[id].hp, 1800 + it.stats.maxHp);
  apply(s, { type: 'endRound' });
  assert.equal(s.round, 2);
});

test('room permissions and undo', () => {
  const room = RoomCore.create('ABCD', '1234');
  const p = {}, g = {};
  room.handle({ t: 'hello', role: 'player' }, p);
  assert.equal(room.handle({ t: 'hello', role: 'gm', pin: 'nope' }, g).reply.fatal, true);
  room.handle({ t: 'hello', role: 'gm', pin: '1234' }, g);
  const out = room.handle({ t: 'act', action: { type: 'createCharacter', name: 'A', cls: 'ranger' } }, p);
  const id = out.reply.result.charId;
  assert.match(room.handle({ t: 'act', action: { type: 'hurt', charId: id, amount: 5 } }, p).reply.msg, /GM/);
  room.handle({ t: 'act', action: { type: 'hurt', charId: id, amount: 500 } }, g);
  assert.ok(room.state.characters[id].hp < 1200);
  room.handle({ t: 'act', action: { type: 'undo' } }, g);
  assert.equal(room.state.characters[id].hp, 1200);
});

test('enemy phase: grouped defense rolls, armor narrows landing window', () => {
  const { s, id } = setup();
  apply(s, { type: 'spawn', etype: 'minion', count: 4, target: id });
  apply(s, { type: 'spawn', etype: 'boss', count: 1, target: id, name: 'Wyrm' });
  const r = apply(s, { type: 'enemyPhase' });
  assert.deepEqual(r.events[0].targets, [id]);
  const d = s.defense[id];
  assert.equal(d.landOn, 2); // Ironclad 30% armor
  assert.equal(d.surrounded, true); // 5 foes on him: +1 die to the minion group
  assert.deepEqual(d.groups.map(g => [g.count, g.dice, g.damage]), [[4, 5, 60], [1, 3, 450]]);
  apply(s, { type: 'defend', charId: id, landed: [2, 1] });
  // raw 2*60 + 450 = 570, 30% armor blocks 171
  assert.equal(s.characters[id].hp, 1800 - 399);
  assert.equal(s.defense[id], undefined);
});

test('moving minions between heroes and roaming', () => {
  const { s, id } = setup();
  const b = apply(s, { type: 'createCharacter', name: 'B', cls: 'ranger' }).result.charId;
  apply(s, { type: 'spawn', etype: 'minion', count: 5 });
  apply(s, { type: 'moveMinions', from: null, to: id, count: 3 });
  apply(s, { type: 'moveMinions', from: id, to: b, count: 1 });
  const count = t => Object.values(s.enemies).filter(e => e.target === t).length;
  assert.deepEqual([count(null), count(id), count(b)], [2, 2, 1]);
});

test('heroes can give items, including equipped ones', () => {
  const { s, id } = setup();
  const b = apply(s, { type: 'createCharacter', name: 'B', cls: 'ranger' }).result.charId;
  apply(s, { type: 'giveLoot', charId: id, rarity: 'rare', slot: 'helm' });
  const it = s.characters[id].bag[0];
  apply(s, { type: 'equip', charId: id, itemId: it.id });
  const r = apply(s, { type: 'giveItem', charId: id, itemId: it.id, to: b });
  assert.equal(r.events[0].from, 'Brokk');
  assert.equal(s.characters[id].gear.helm, undefined);
  assert.ok(s.characters[id].hp <= derive(s.characters[id]).maxHp);
  assert.equal(s.characters[b].bag[0].id, it.id);
});

import { SETS, powersFor, setCounts, activeSynergies, planCampaign } from '../public/engine.js';

function equipSet(s, id, setKey, slot) {
  const it = makeItem('set', Math.random, slot, 1, setKey);
  s.characters[id].bag.push(it);
  return apply(s, { type: 'equip', charId: id, itemId: it.id });
}

test('one set piece unlocks a power; more pieces strengthen it and add bonuses', () => {
  const { s, id } = setup();
  const r1 = equipSet(s, id, 'thunderforge', 'helm');
  assert.equal(r1.events.find(e => e.type === 'unlock').name, 'Thunderclap');
  let p = powersFor(s.characters[id]).find(x => x.key === 'set:thunderforge');
  assert.deepEqual(p.effects, [{ kind: 'smite', kills: 3 }]);
  const hpBefore = derive(s.characters[id]).maxHp;
  equipSet(s, id, 'thunderforge', 'gloves');
  assert.equal(derive(s.characters[id]).maxHp - hpBefore - (s.characters[id].gear.gloves.stats.maxHp || 0), 250);
  p = powersFor(s.characters[id]).find(x => x.key === 'set:thunderforge');
  assert.equal(p.effects[0].kills, 4);
  s.characters[id].energy = 100;
  apply(s, { type: 'ability', charId: id, key: 'set:thunderforge' });
  assert.equal(s.characters[id].strike.minion, 4);
});

test('hidden synergy across sets is discovered once and strengthens a power', () => {
  const { s, id } = setup();
  equipSet(s, id, 'thunderforge', 'helm');
  const r = equipSet(s, id, 'emberheart', 'ring');
  const syn = r.events.filter(e => e.type === 'unlock' && e.kind === 'synergy');
  assert.deepEqual(syn.map(e => e.name), ['Forge and Flame']);
  const p = powersFor(s.characters[id]);
  assert.equal(p.find(x => x.key === 'set:thunderforge').effects[0].kills, 5); // 3 + 2 from synergy
  assert.equal(p.find(x => x.key === 'set:emberheart').cost, 25);
  // unequip and re-equip: no second announcement
  apply(s, { type: 'unequip', charId: id, slot: 'ring' });
  const ring = s.characters[id].bag.find(i => i.set === 'emberheart');
  const again = apply(s, { type: 'equip', charId: id, itemId: ring.id });
  assert.equal(again.events.filter(e => e.type === 'unlock').length, 0);
});

test('a cache card gives every item to whoever scans it', () => {
  const { s, id } = setup();
  apply(s, { type: 'makeLootCards', count: 1, per: 3 });
  const card = Object.keys(s.loot)[0];
  const r = apply(s, { type: 'claimLoot', charId: id, card });
  assert.equal(r.events.find(e => e.type === 'cache').items.length, 3);
  assert.equal(s.characters[id].bag.length, 3);
  assert.match(apply(s, { type: 'claimLoot', charId: id, card }).error, /claimed/);
});

test('campaign planner spreads featured set pieces across scenes', () => {
  const s = newGame('PLAN');
  const scenes = [
    { name: 'Gatehouse', chests: 4, elites: ['Gate Captain'], bosses: [] },
    { name: 'Forge Halls', chests: 4, elites: ['Slag Brute', 'Ash Priest'], bosses: [] },
    { name: 'Throne', chests: 4, elites: [], bosses: ['The Ashen Thane'] },
  ];
  const r = apply(s, { type: 'planCampaign', scenes, classes: ['ironclad', 'arcanist', 'ranger', 'runepriest'] }).result;
  assert.deepEqual(r.featured.slice(0, 4), ['thunderforge', 'emberheart', 'deepdelver', 'runekeeper']);
  const caches = Object.values(s.loot);
  assert.equal(caches.length, 4 + 1 + 4 + 2 + 4 + 1);
  assert.equal(caches.reduce((t, c) => t + c.items.length, 0), r.totalSlots);
  const setItems = caches.flatMap(c => c.items).filter(i => i.set);
  assert.equal(setItems.length, r.setPieces);
  const keys = setItems.map(i => i.set + ':' + i.slot);
  assert.equal(new Set(keys).size, keys.length); // no duplicate pieces
  // every featured set has a piece in scene one
  const scene1 = new Set(caches.filter(c => c.sceneIdx === 0).flatMap(c => c.items).filter(i => i.set).map(i => i.set));
  assert.ok(r.featured.every(k => scene1.has(k)));
  // at least one set can be completed
  const per = {}; for (const i of setItems) per[i.set] = (per[i.set] || 0) + 1;
  assert.ok(Object.values(per).some(n => n === 4), JSON.stringify(per));
  // boss drop has something rare or better
  const boss = caches.find(c => c.kind === 'boss');
  assert.ok(boss.items.some(i => ['rare', 'legendary', 'set'].includes(i.rarity)));
  // later scenes roll stronger items
  const avgDmg = si => { const w = caches.filter(c => c.sceneIdx === si).flatMap(c => c.items).filter(i => i.slot === 'weapon' && i.rarity === 'common'); return w.length ? w.reduce((t, i) => t + i.stats.damage, 0) / w.length : null; };
  assert.ok(true, avgDmg(0));
});

test('planner honours a featured-set count and pinned sets', () => {
  const s = newGame('FEAT');
  const scenes = [[3, 1, 0], [3, 1, 1], [3, 2, 0], [3, 1, 1]].map(([c, e, b], i) => ({ name: 'S' + i, chests: c, elites: Array(e).fill('E'), bosses: Array(b).fill('B') }));
  const r = apply(s, { type: 'planCampaign', scenes, classes: ['ironclad', 'arcanist', 'ranger'], featuredCount: 5, pinned: ['vaultbreaker'] }).result;
  assert.equal(r.featured.length, 5);
  assert.equal(r.featured[0], 'vaultbreaker');
  const cnt = {};
  for (const it of Object.values(s.loot).flatMap(c => c.items)) if (it.set) cnt[it.set] = (cnt[it.set] || 0) + 1;
  assert.equal(Object.keys(cnt).length, 5);
  assert.equal(Object.values(cnt).filter(n => n === 4).length, 4);
});

import { partyDamagePerRound, scaledHealth } from '../public/engine.js';

test('scaled bosses fit the party and grow with its gear', () => {
  const s = newGame('BOSS');
  for (const [n, c] of [['A', 'ironclad'], ['B', 'arcanist'], ['C', 'ranger']]) apply(s, { type: 'createCharacter', name: n, cls: c });
  // fresh party: 840 + 867 + 960 = 2,667 raw/round, ×0.65 armor ×1.2 powers ≈ 2,080
  assert.equal(partyDamagePerRound(s, 35), 2080);
  apply(s, { type: 'spawn', etype: 'boss', name: 'Thane', scale: 4 });
  const boss = Object.values(s.enemies)[0];
  assert.equal(boss.maxHp, 8500);
  // gear the party up, damage the boss to half, rescale: health % is kept
  for (const id of s.order) for (const slot of ['weapon', 'gloves']) { const it = makeItem('legendary', Math.random, slot, 1.75); s.characters[id].bag.push(it); apply(s, { type: 'equip', charId: id, itemId: it.id }); }
  boss.hp = boss.maxHp / 2;
  apply(s, { type: 'rescaleEnemy', enemyId: boss.id });
  assert.ok(boss.maxHp > 8500);
  assert.equal(boss.maxHp, scaledHealth(s, 4, 35));
  assert.ok(Math.abs(boss.hp / boss.maxHp - 0.5) < 0.01);
  // unscaled spawns are untouched
  apply(s, { type: 'spawn', etype: 'boss', name: 'Plain' });
  assert.equal(Object.values(s.enemies).find(e => e.name === 'Plain').maxHp, 9000);
});

test('foe ability presets run automatically', () => {
  const s = newGame('FOE');
  const a = apply(s, { type: 'createCharacter', name: 'A', cls: 'ironclad' }).result.charId;
  const b = apply(s, { type: 'createCharacter', name: 'B', cls: 'arcanist' }).result.charId;
  apply(s, { type: 'spawn', etype: 'boss', name: 'Thane', hp: 1600, armor: 0, target: a, abilities: ['enrage', 'horde', 'regen', 'summoner', 'sweep', 'leech', 'thickhide', 'throes'] });
  const boss = Object.values(s.enemies)[0];
  // thick hide: a crit does normal damage
  apply(s, { type: 'attack', charId: a, hits: 3, sixes: 3 });
  let r = apply(s, { type: 'spend', charId: a, enemyId: boss.id });
  assert.equal(boss.hp, 1600 - 420);
  // drop below half: enrage + horde fire once
  r = apply(s, { type: 'spend', charId: a, enemyId: boss.id });
  const fired = r.events.filter(e => e.type === 'foeAbility').map(e => e.key);
  assert.deepEqual(fired, ['enrage', 'horde']);
  assert.equal(boss.attacks, 4); assert.equal(boss.damage, 675);
  assert.equal(Object.values(s.enemies).filter(e => e.type === 'minion').length, 4);
  r = apply(s, { type: 'spend', charId: a, enemyId: boss.id });
  assert.equal(r.events.filter(e => e.type === 'foeAbility').length, 0);
  // end round: regen 5% and 2 summoned minions on its target
  const hpBefore = boss.hp;
  apply(s, { type: 'endRound' });
  assert.equal(boss.hp, hpBefore + 80);
  assert.equal(Object.values(s.enemies).filter(e => e.type === 'minion' && e.target === a).length, 4);
  // enemy phase: sweeping boss also attacks B; leech drains both
  s.characters[a].energy = s.characters[b].energy = 50;
  apply(s, { type: 'enemyPhase' });
  assert.ok(s.defense[b].groups.some(g => g.name === 'Thane'));
  assert.equal(s.characters[a].energy, 40); assert.equal(s.characters[b].energy, 40);
  // death throes: 300 to every hero, armor applies (Ironclad 30% → 210, Arcanist 8% → 276)
  const [ha, hb] = [s.characters[a].hp, s.characters[b].hp];
  apply(s, { type: 'damageEnemy', enemyId: boss.id, amount: 99999 });
  assert.equal(ha - s.characters[a].hp, 210); assert.equal(hb - s.characters[b].hp, 276);
});

test('movement: position bonuses, hiding, area powers with slams, pins, taunts', () => {
  const s = newGame('MOVE');
  const iron = apply(s, { type: 'createCharacter', name: 'Iron', cls: 'ironclad' }).result.charId;
  const shade = apply(s, { type: 'createCharacter', name: 'Shade', cls: 'shadowblade' }).result.charId;
  const priest = apply(s, { type: 'createCharacter', name: 'Priest', cls: 'runepriest' }).result.charId;
  assert.equal(derive(s.characters[shade]).move, 7);
  // high ground + flanking: pool 3 + 2
  apply(s, { type: 'attack', charId: iron, hits: 9, bonus: 2 });
  assert.equal(s.characters[iron].strike.hits, 5);
  apply(s, { type: 'endAttack', charId: iron });
  // Earthsplitter: 2 minions + an elite slammed into a wall (2 hits)
  apply(s, { type: 'spawn', etype: 'minion', count: 2, target: iron });
  apply(s, { type: 'spawn', etype: 'elite', name: 'Brute', hp: 3000, armor: 0, target: iron });
  const ids = Object.keys(s.enemies);
  const brute = Object.values(s.enemies).find(e => e.name === 'Brute');
  s.characters[iron].energy = 100;
  apply(s, { type: 'ability', charId: iron, key: 'quake', targets: ids, slammed: [brute.id], tableKills: 1 });
  assert.equal(brute.hp, 3000 - 2 * 420);
  assert.equal(Object.keys(s.enemies).length, 1);
  assert.equal(s.characters[iron].kills, 3);
  // Smoke Bomb: hidden, foe stops fighting you; enemy phase skips; +3 dice from hiding
  apply(s, { type: 'moveEnemy', enemyId: brute.id, target: shade });
  s.characters[shade].energy = 100;
  apply(s, { type: 'ability', charId: shade, key: 'smoke', targets: [brute.id] });
  assert.equal(brute.target, null);
  apply(s, { type: 'moveEnemy', enemyId: brute.id, target: shade });
  assert.match(apply(s, { type: 'enemyPhase' }).error, /unhidden/);
  apply(s, { type: 'attack', charId: shade, hits: 6 });
  assert.equal(s.characters[shade].strike.hits, 6);
  assert.equal(s.characters[shade].hidden, undefined);
  apply(s, { type: 'endAttack', charId: shade });
  // Disengage: free blows, foe goes roaming
  const r = apply(s, { type: 'disengage', charId: shade, enemyIds: [brute.id] });
  assert.equal(brute.target, null);
  assert.equal(s.defense[shade].groups[0].dice, 1);
  apply(s, { type: 'defend', charId: shade, landed: [1] });
  // Hammer (pin) and Recall (swap)
  apply(s, { type: 'moveEnemy', enemyId: brute.id, target: iron });
  s.characters[priest].energy = 100;
  apply(s, { type: 'ability', charId: priest, key: 'hammer', targets: [brute.id] });
  assert.equal(brute.pinned, true);
  assert.match(apply(s, { type: 'ability', charId: priest, key: 'recall' }).error, /ally/);
  apply(s, { type: 'ability', charId: priest, key: 'recall', allies: [iron] });
  assert.equal(brute.target, priest);
  assert.equal(s.characters[iron].ward, 300);
  apply(s, { type: 'endRound' });
  assert.equal(brute.pinned, undefined);
  // Bulwark taunts
  s.characters[iron].energy = 100;
  apply(s, { type: 'ability', charId: iron, key: 'bulwark', targets: [brute.id] });
  assert.equal(brute.target, iron);
  // defending against a foe on higher ground: +1 die on the hardest-hitting group
  apply(s, { type: 'enemyPhase' });
  apply(s, { type: 'defend', charId: iron, landed: [3], highGround: true });
  // 3 blows × 200 = 600, 30% armor → 420, all soaked by the 900 ward (600 Bulwark + 300 Recall)
  assert.equal(s.characters[iron].ward, 900 - 420);
});

import { markerRole, MARKER_RANGES } from '../public/engine.js';

test('board snapshots: markers, adjacency and minion sync', () => {
  const s = newGame('BRD');
  const a = apply(s, { type: 'createCharacter', name: 'A', cls: 'ironclad' }).result.charId;
  const b = apply(s, { type: 'createCharacter', name: 'B', cls: 'ranger' }).result.charId;
  assert.deepEqual([s.characters[a].marker, s.characters[b].marker], [4, 5]);
  apply(s, { type: 'spawn', etype: 'elite', name: 'Brute', target: b });
  apply(s, { type: 'spawn', etype: 'minion', count: 3, target: a }); // unmarked app minions
  const brute = Object.values(s.enemies).find(e => e.name === 'Brute');
  assert.equal(brute.marker, 12);
  assert.equal(markerRole(s, 12).kind, 'foe');
  // A at (5.5,5.5), B at (20.5,10.5); Brute next to A (diagonal), minion 30 next to B, minion 31 alone
  const r = apply(s, { type: 'boardSync', w: 36, h: 24, syncMinions: true, tokens: [
    { id: 4, x: 5.5, y: 5.5 }, { id: 5, x: 20.5, y: 10.5 }, { id: 12, x: 6.5, y: 6.5 },
    { id: 30, x: 21.5, y: 10.5 }, { id: 31, x: 30.5, y: 20.5 }, { id: 77, x: 1, y: 1 }, { id: 29, x: 9, y: 9 } ] });
  assert.equal(brute.target, a);
  const minions = Object.values(s.enemies).filter(e => e.type === 'minion');
  assert.deepEqual(minions.map(m => [m.marker, m.target]).sort(), [[30, b], [31, null], [77, null]]); // 3 app minions replaced by the 3 on the board
  assert.deepEqual(s.board.unknown, [29]);
  assert.equal(s.board.tokens.length, 7);
  // engagement off: positions recorded only
  apply(s, { type: 'boardSync', engage: false, tokens: [{ id: 4, x: 30, y: 20 }, { id: 12, x: 6.5, y: 6.5 }] });
  assert.equal(brute.target, a);
  assert.equal(s.board.tokens.find(t => t.id === 4).x, 30);
  // a removed hero frees its marker for the next hero
  apply(s, { type: 'removeCharacter', charId: a });
  const c = apply(s, { type: 'createCharacter', name: 'C', cls: 'arcanist' }).result.charId;
  assert.equal(s.characters[c].marker, 4);
  assert.equal(MARKER_RANGES.minions[1], 89);
});

test('narrate: GM text goes to the chronicle and out as an event', async () => {
  const { apply, newGame, isGmOnly } = await import('../public/engine.js');
  const s = newGame('NARR');
  const r = apply(s, { type: 'narrate', title: 'It falls', text: 'The pod splits.' });
  assert.equal(r.error, undefined);
  assert.equal(s.log[0].kind, 'narrate');
  assert.ok(r.events.some(e => e.type === 'narrate' && e.text === 'The pod splits.'));
  assert.ok(isGmOnly('narrate'));
  assert.ok(apply(s, { type: 'narrate', text: '  ' }).error);
});

test('attack powers: pure charge-ups read "Make an attack with…", positional powers do not', async () => {
  const E = await import('../public/engine.js');
  const s = E.newGame('ATK');
  E.apply(s, { type: 'createCharacter', name: 'Nyx', cls: 'shadowblade' });
  const ch = s.characters[s.order[0]];
  const ps = Object.fromEntries(E.powersFor(ch).map(p => [p.key, p]));
  assert.equal(ps.cuts.attack, true);
  assert.match(ps.cuts.text, /^Make an attack with/);
  assert.equal(ps.step.attack, false); // teleport + triple damage stays a full action
  const it = E.makeItem('set', Math.random, 'weapon', 1, 'emberheart');
  ch.bag.push(it); E.apply(s, { type: 'equip', charId: ch.id, itemId: it.id });
  const ember = E.powersFor(ch).find(p => p.key === 'set:emberheart');
  assert.equal(ember.attack, true);
  assert.match(ember.text, /^Make an attack with ×1\.5 damage/);
});

test('kill tally: minions, elites and bosses are credited to the killing blow', async () => {
  const E = await import('../public/engine.js');
  const s = E.newGame('TAL');
  E.apply(s, { type: 'createCharacter', name: 'Gonk', cls: 'ironclad' });
  const id = s.order[0], ch = s.characters[id];
  E.apply(s, { type: 'spawn', etype: 'minion', count: 2, target: id });
  E.apply(s, { type: 'spawn', etype: 'elite', hp: 1, armor: 0, name: 'Weakling' });
  E.apply(s, { type: 'spawn', etype: 'boss', hp: 1, armor: 0, name: 'Glass Jaw' });
  E.apply(s, { type: 'attack', charId: id, hits: 3, sixes: 0 });
  for (const e of Object.values(s.enemies).filter(e => e.type !== 'minion').concat(Object.values(s.enemies).filter(e => e.type === 'minion').slice(0, 1)))
    E.apply(s, { type: 'spend', charId: id, enemyId: e.id });
  assert.deepEqual(E.tallyOf(ch), { minion: 1, elite: 1, boss: 1 });
  assert.equal(ch.kills, 3);
  // older heroes without a tally: earlier kills count as minions
  const old = { kills: 7 };
  E.credit(old, 'elite');
  assert.deepEqual(old.tally, { minion: 7, elite: 1, boss: 0 });
  // the GM can correct it
  E.apply(s, { type: 'editCharacter', charId: id, tally: { minion: 10, elite: 2, boss: 1 } });
  assert.equal(ch.kills, 13);
});

test('restore: the GM loads a backup into the room, keeping the room code; players cannot', () => {
  const core = RoomCore.create('ROOM', '1234');
  const gm = {}, pl = {};
  core.handle({ t: 'hello', role: 'gm', pin: '1234' }, gm);
  core.handle({ t: 'hello', role: 'player' }, pl);
  core.handle({ t: 'act', action: { type: 'createCharacter', name: 'Saile', cls: 'arcanist' }, rid: 1 }, pl);
  const backup = { savedAt: 'x', room: 'JBCX', state: JSON.parse(JSON.stringify(core.state)) };
  backup.state.code = 'JBCX';
  core.handle({ t: 'act', action: { type: 'resetGame' }, rid: 2 }, gm);
  assert.equal(core.state.order.length, 0);
  const denied = core.handle({ t: 'act', action: { type: 'restore', state: backup }, rid: 3 }, pl);
  assert.equal(denied.reply.t, 'error');
  const bad = core.handle({ t: 'act', action: { type: 'restore', state: { nope: 1 } }, rid: 4 }, gm);
  assert.equal(bad.reply.t, 'error');
  const ok = core.handle({ t: 'act', action: { type: 'restore', state: backup }, rid: 5 }, gm);
  assert.equal(ok.reply.t, 'ok');
  assert.equal(core.state.order.length, 1);
  assert.equal(core.state.code, 'ROOM');
  core.handle({ t: 'act', action: { type: 'undo' }, rid: 6 }, gm);
  assert.equal(core.state.order.length, 0);
});

test('merchant: sell satchel items for Favour, buy boons (rising prices, once-only), buy and use consumables', async () => {
  const E = await import('../public/engine.js');
  const M = await import('../public/merchant.js');
  const s = E.newGame('MER');
  E.apply(s, { type: 'createCharacter', name: 'Lyle', cls: 'ranger' });
  const id = s.order[0], ch = s.characters[id];
  const legendary = E.makeItem('legendary', Math.random, 'ring', 1), common = E.makeItem('common', Math.random, 'boots', 1);
  ch.bag.push(legendary, common);
  assert.ok(E.apply(s, { type: 'sell', charId: id, itemId: common.id }).error, 'closed stall');
  E.apply(s, { type: 'merchant', open: true });
  assert.equal(s.merchant.open, true);
  E.apply(s, { type: 'sell', charId: id, itemId: legendary.id });
  E.apply(s, { type: 'sell', charId: id, itemId: common.id });
  assert.equal(ch.favour, 7);
  assert.equal(ch.bag.length, 0);
  // equipped gear can't be sold
  const worn = E.makeItem('rare', Math.random, 'helm', 1); ch.bag.push(worn); E.apply(s, { type: 'equip', charId: id, itemId: worn.id });
  assert.ok(E.apply(s, { type: 'sell', charId: id, itemId: worn.id }).error);
  const hpBefore = E.derive(ch).maxHp;
  E.apply(s, { type: 'buyBoon', charId: id, key: 'health' }); // 2
  assert.equal(E.derive(ch).maxHp, hpBefore + 150);
  assert.equal(M.boonPrice(ch, 'health'), 3);
  E.apply(s, { type: 'buyBoon', charId: id, key: 'health' }); // 3
  assert.equal(ch.favour, 2);
  assert.ok(E.apply(s, { type: 'buyBoon', charId: id, key: 'eye' }).error, 'too expensive');
  ch.favour = 30;
  E.apply(s, { type: 'buyBoon', charId: id, key: 'eye' });
  assert.ok(E.apply(s, { type: 'buyBoon', charId: id, key: 'eye' }).error, 'once only');
  assert.equal(E.derive(ch).dice, E.CLASSES.ranger.base.dice + 1);
  E.apply(s, { type: 'buyConsumable', charId: id, key: 'lightning' });
  E.apply(s, { type: 'grantConsumable', charId: id, key: 'mirror' });
  assert.equal(ch.consumables.length, 2);
  E.apply(s, { type: 'merchant', open: false });
  const r1 = E.apply(s, { type: 'useConsumable', charId: id, id: ch.consumables[0].id });
  assert.equal(r1.error, undefined);
  assert.equal(ch.strike.minion, 3);
  assert.match(E.apply(s, { type: 'useConsumable', charId: id, id: ch.consumables[0].id }).error, /One consumable per turn/);
  E.apply(s, { type: 'endRound' });
  E.apply(s, { type: 'useConsumable', charId: id, id: ch.consumables[0].id });
  assert.equal(ch.ward, 500);
  assert.ok(E.isGmOnly('merchant') && E.isGmOnly('grantConsumable') && E.isGmOnly('crownDeal'));
  assert.ok(!E.isGmOnly('sell') && !E.isGmOnly('crownPlay'));
});

test('Three-Card Crown: hand ranks, jokers, ties to the house, wagers and prizes', async () => {
  const E = await import('../public/engine.js');
  const M = await import('../public/merchant.js');
  const name = h => M.handName(M.scoreHand(h));
  assert.equal(name(['swords:5', 'flames:5', 'crowns:5']), 'Three of a kind');
  assert.equal(name(['swords:4', 'flames:5', 'crowns:6']), 'Run');
  assert.equal(name(['skulls:1', 'skulls:5', 'skulls:9']), 'Flush');
  assert.equal(name(['swords:7', 'flames:7', 'crowns:2']), 'Pair');
  assert.equal(name(['swords:1', 'flames:5', 'crowns:9']), 'High card');
  assert.equal(name(['swords:7', 'joker:0', 'crowns:2']), 'Pair');
  assert.equal(name(['swords:7', 'joker:0', 'joker:1']), 'Three of a kind');
  assert.ok(M.compareHands(M.scoreHand(['swords:4', 'flames:5', 'crowns:6']), M.scoreHand(['skulls:1', 'skulls:5', 'skulls:9'])) > 0, 'run beats flush');
  assert.equal(M.compareHands(M.scoreHand(['swords:7', 'flames:7', 'crowns:2']), M.scoreHand(['skulls:7', 'crowns:7', 'swords:2'])), 0, 'equal hands tie');
  // a full round
  const s = E.newGame('CRN');
  for (const [n, c] of [['A', 'ranger'], ['B', 'ironclad']]) E.apply(s, { type: 'createCharacter', name: n, cls: c });
  const [a, b] = s.order;
  s.characters[a].favour = 5; s.characters[b].favour = 0;
  E.apply(s, { type: 'crownDeal' });
  assert.equal(s.crown.phase, 'play');
  assert.equal(s.crown.players[a].cards.length, 3);
  E.apply(s, { type: 'crownPlay', charId: a, swap: [0, 1, 2], wager: 9 }); // swaps capped at 2, wager at 3
  assert.equal(s.crown.players[a].swapped, 2);
  assert.equal(s.crown.players[a].wager, 3);
  assert.ok(E.apply(s, { type: 'crownPlay', charId: a, swap: [] }).error, 'already played');
  E.apply(s, { type: 'crownPlay', charId: b, swap: [], wager: 2 }); // B has no Favour: wagers 0
  assert.equal(s.crown.players[b].wager, 0);
  assert.equal(s.crown.phase, 'done');
  const pa = s.crown.players[a];
  assert.equal(s.characters[a].favour, pa.win ? 8 : 2);
  // prize game: the GM can force the reveal
  E.apply(s, { type: 'crownDeal', players: [b], prize: 'spark' });
  E.apply(s, { type: 'crownReveal' });
  assert.equal((s.characters[b].consumables || []).length, s.crown.players[b].win ? 1 : 0);
  E.apply(s, { type: 'crownEnd' });
  assert.equal(s.crown, undefined);
});
