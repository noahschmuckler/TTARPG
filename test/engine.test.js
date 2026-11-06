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
