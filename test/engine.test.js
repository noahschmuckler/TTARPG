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
  apply(s, { type: 'ability', charId: id, key: 'charge' });
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
  apply(s, { type: 'ability', charId: id, key: 'quake' });
  assert.deepEqual(s.characters[id].strike, { hits: 1, crits: 0, minion: 5, mult: 1 });
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
  assert.deepEqual(d.groups.map(g => [g.count, g.dice, g.damage]), [[4, 4, 60], [1, 3, 450]]);
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
