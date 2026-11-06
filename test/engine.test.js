import test from 'node:test';
import assert from 'node:assert/strict';
import { apply, newGame, derive, makeItem, RARITY_ORDER } from '../public/engine.js';
import { RoomCore } from '../server/room.js';

function setup() {
  const s = newGame('TEST');
  const { result } = apply(s, { type: 'createCharacter', name: 'Brokk', cls: 'ironclad' });
  return { s, id: result.charId };
}

test('kills grant energy, tracked minions are removed', () => {
  const { s, id } = setup();
  apply(s, { type: 'spawn', etype: 'minion', count: 4, target: id });
  const r = apply(s, { type: 'attack', charId: id, targetId: 'minions', hits: 3, sixes: 0 });
  assert.equal(r.events[0].kills, 3);
  assert.equal(Object.keys(s.enemies).length, 1);
  assert.equal(s.characters[id].energy, 20 + 3 * 8);
});

test('untracked kills still count', () => {
  const { s, id } = setup();
  apply(s, { type: 'quickKill', charId: id, n: 2 });
  assert.equal(s.characters[id].kills, 2);
});

test('hits are capped by dice pool; buffs add dice and are consumed', () => {
  const { s, id } = setup();
  const r = apply(s, { type: 'attack', charId: id, hits: 9 });
  assert.equal(r.events[0].hits, 3);
  s.characters[id].energy = 100;
  apply(s, { type: 'ability', charId: id, key: 'charge' });
  assert.equal(derive(s.characters[id]).pool, 5);
  apply(s, { type: 'attack', charId: id, hits: 5 });
  assert.equal(derive(s.characters[id]).pool, 3);
});

test('elite damage with crits, armor and ward on hurt', () => {
  const { s, id } = setup();
  apply(s, { type: 'spawn', etype: 'elite', count: 1, target: id });
  const eid = Object.keys(s.enemies)[0];
  apply(s, { type: 'attack', charId: id, targetId: eid, hits: 2, sixes: 1 });
  assert.equal(s.enemies[eid].hp, 2400 - (420 + 840));
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
