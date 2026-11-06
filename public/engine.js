// Delvers' Ledger — shared game engine.
// Pure functions over a plain JSON game state. Used by the server (authoritative)
// and by the browser (for derived stats and display). No DOM, no I/O.

import { SETS, SYNERGIES, CLASS_SETS } from './sets.js';
export { SETS, SYNERGIES, CLASS_SETS };

export const HIT_ON = 4; // every foe is hit on a 4, 5 or 6

// ---------------------------------------------------------------- classes
// Base stats are deliberately "big number" ARPG-scale. Players never add them up;
// the app does. Dice = how many d6 the hero rolls on an attack.
export const CLASSES = {
  ironclad: {
    name: 'Ironclad', role: 'Shieldwall warrior', glyph: '⛨',
    base: { maxHp: 1800, armor: 30, dice: 3, damage: 420, energyPerKill: 8, energyPerRound: 10, maxEnergy: 100, critMult: 2, cleave: 0 },
    abilities: [
      { key: 'charge', name: 'Cleaving Charge', cost: 30, text: 'Roll +2 dice on your next attack.', effect: { kind: 'buff', bonusDice: 2 } },
      { key: 'bulwark', name: 'Iron Bulwark', cost: 40, text: 'Gain a 600-point ward that soaks damage.', effect: { kind: 'ward', amount: 600, who: 'self' } },
      { key: 'quake', name: 'Earthsplitter', cost: 80, text: 'Gain 5 minion-slaying hits. Tap minions to cut them down.', effect: { kind: 'smite', kills: 5 } },
    ],
  },
  runepriest: {
    name: 'Runepriest', role: 'Forge-cleric', glyph: 'ᛟ',
    base: { maxHp: 1400, armor: 20, dice: 2, damage: 300, energyPerKill: 6, energyPerRound: 18, maxEnergy: 100, critMult: 2, cleave: 0 },
    abilities: [
      { key: 'mend', name: 'Mending Rune', cost: 35, text: 'Heal every hero for 20% of their max health.', effect: { kind: 'heal', pct: 20, who: 'party' } },
      { key: 'ward', name: 'Ward of Stone', cost: 45, text: 'Every hero gains a 350-point ward.', effect: { kind: 'ward', amount: 350, who: 'party' } },
      { key: 'bless', name: 'Forge-Blessing', cost: 60, text: 'Every other hero gains 25 energy.', effect: { kind: 'energize', amount: 25, who: 'others' } },
    ],
  },
  ranger: {
    name: 'Ranger', role: 'Deep-tunnel marksman', glyph: '➶',
    base: { maxHp: 1200, armor: 12, dice: 4, damage: 360, energyPerKill: 10, energyPerRound: 10, maxEnergy: 100, critMult: 2, cleave: 0 },
    abilities: [
      { key: 'volley', name: 'Volley', cost: 35, text: 'Roll +3 dice on your next attack.', effect: { kind: 'buff', bonusDice: 3 } },
      { key: 'pierce', name: 'Piercing Shot', cost: 50, text: 'Your next attack deals double damage.', effect: { kind: 'buff', damageMult: 2 } },
      { key: 'rain', name: 'Rain of Bolts', cost: 80, text: 'Gain 6 minion-slaying hits. Tap minions to cut them down.', effect: { kind: 'smite', kills: 6 } },
    ],
  },
  arcanist: {
    name: 'Arcanist', role: 'Ember-sage', glyph: '✶',
    base: { maxHp: 1000, armor: 8, dice: 2, damage: 650, energyPerKill: 7, energyPerRound: 20, maxEnergy: 100, critMult: 2, cleave: 0 },
    abilities: [
      { key: 'lance', name: 'Ember Lance', cost: 30, text: 'Your next attack deals double damage.', effect: { kind: 'buff', damageMult: 2 } },
      { key: 'glyph', name: 'Frost Glyph', cost: 45, text: 'Gain 3 minion-slaying hits. Tap minions to cut them down.', effect: { kind: 'smite', kills: 3 } },
      { key: 'meteor', name: 'Meteor', cost: 90, text: 'Next attack: +4 dice and double damage.', effect: { kind: 'buff', bonusDice: 4, damageMult: 2 } },
    ],
  },
  shadowblade: {
    name: 'Shadowblade', role: 'Vault-breaker rogue', glyph: '⚔',
    base: { maxHp: 1100, armor: 15, dice: 3, damage: 480, energyPerKill: 12, energyPerRound: 8, maxEnergy: 100, critMult: 3, cleave: 0 },
    abilities: [
      { key: 'vanish', name: 'Vanish', cost: 30, text: 'Gain a 450-point ward.', effect: { kind: 'ward', amount: 450, who: 'self' } },
      { key: 'backstab', name: 'Backstab', cost: 40, text: 'Your next attack deals triple damage.', effect: { kind: 'buff', damageMult: 3 } },
      { key: 'cuts', name: 'Thousand Cuts', cost: 75, text: 'Roll +4 dice on your next attack.', effect: { kind: 'buff', bonusDice: 4 } },
    ],
  },
};

// ---------------------------------------------------------------- enemies
export const ENEMY_TYPES = {
  minion: { label: 'Minion', hp: 1, damage: 60, armor: 0, attacks: 1, energyMult: 1 },
  elite: { label: 'Elite', hp: 2000, damage: 200, armor: 20, attacks: 2, energyMult: 4 },
  boss: { label: 'Boss', hp: 9000, damage: 450, armor: 35, attacks: 3, energyMult: 10 },
};

// ---------------------------------------------------------------- items
export const SLOTS = ['weapon', 'helm', 'armor', 'gloves', 'boots', 'amulet', 'ring'];
export const SLOT_LABEL = { weapon: 'Weapon', helm: 'Helm', armor: 'Armor', gloves: 'Gloves', boots: 'Boots', amulet: 'Amulet', ring: 'Ring' };

export const STAT_INFO = {
  maxHp: { label: 'Max Health', fmt: v => `+${fmt(v)}` },
  armor: { label: 'Armor', fmt: v => `+${v}%` },
  damage: { label: 'Damage per Hit', fmt: v => `+${fmt(v)}` },
  energyPerKill: { label: 'Energy per Kill', fmt: v => `+${v}` },
  energyPerRound: { label: 'Energy per Round', fmt: v => `+${v}` },
  maxEnergy: { label: 'Max Energy', fmt: v => `+${v}` },
  critMult: { label: 'Critical Multiplier', fmt: v => `+${v}×` },
  cleave: { label: 'Cleave (extra minion per 6)', fmt: v => `+${v}` },
  dice: { label: 'Attack Dice', fmt: v => `+${v} die` },
};

const AFFIX_RANGE = {
  maxHp: [80, 420], armor: [2, 7], damage: [40, 260], energyPerKill: [1, 4],
  energyPerRound: [2, 8], maxEnergy: [10, 30], critMult: [1, 4], // critMult in quarters
};
const SLOT_PRIMARY = {
  weapon: 'damage', helm: 'maxHp', armor: 'armor', gloves: 'damage', boots: 'energyPerRound', amulet: 'maxEnergy', ring: 'energyPerKill',
};

export const RARITIES = {
  common: { label: 'Common', affixes: 1, power: 0.6 },
  magic: { label: 'Magic', affixes: 2, power: 0.85 },
  rare: { label: 'Rare', affixes: 3, power: 1.0 },
  legendary: { label: 'Legendary', affixes: 3, power: 1.35 },
  set: { label: 'Set', affixes: 2, power: 1.0 },
};
export const RARITY_ORDER = ['common', 'magic', 'rare', 'legendary', 'set'];

const BASES = {
  weapon: ['Warhammer', 'Bearded Axe', 'Arbalest', 'Rune Staff', 'Twin Dirks', 'Maul', 'Pick-Axe'],
  helm: ['Great Helm', 'Crested Helm', 'Mask of Iron', 'Coif'],
  armor: ['Hauberk', 'Plate Cuirass', 'Scale Coat', 'Forge Apron'],
  gloves: ['Gauntlets', 'Grips', 'Forge Mitts', 'Bracers'],
  boots: ['Sabatons', 'Tunnel Boots', 'Greaves', 'Stompers'],
  amulet: ['Torc', 'Rune Pendant', 'Medallion', 'Chain of Office'],
  ring: ['Signet', 'Band', 'Ring of Office', 'Knuckle-Ring'],
};
const PREFIX = ['Runeforged', 'Granite', 'Emberwrought', 'Gilded', 'Anvil-Struck', 'Mithral-Shod', 'Thane\'s', 'Bronzebound', 'Hearthfire', 'Obsidian'];
const SUFFIX = ['of the Anvil', 'of Deep Halls', 'of the Eighth Gate', 'of Ash and Iron', 'of the Last Vault', 'of Grudges', 'of the Mountain King', 'of Brass Thunder'];
const LEGEND = ['Grudgebearer', 'Hammer of Kazrun', 'The Stonefather\'s Oath', 'Lantern-Eater', 'Dawn Under Mountain', 'Ninth Rivet', 'Kingsfall', 'The Unbroken Seam', 'Ember-Heart', 'Lockjaw'];

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const roll = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const uid = (rng = Math.random) => Math.floor(rng() * 2 ** 32).toString(36) + Date.now().toString(36).slice(-4);

// level: item power multiplier (1 = scene one; the planner raises it scene by scene)
export function makeItem(rarity = 'magic', rng = Math.random, slot, level = 1, setKey) {
  const R = RARITIES[rarity] || RARITIES.magic;
  let set = null;
  if (rarity === 'set') {
    const keys = Object.keys(SETS).filter(k => !slot || SETS[k].pieces[slot]);
    setKey = setKey && SETS[setKey] && (!slot || SETS[setKey].pieces[slot]) ? setKey : pick(rng, keys.length ? keys : Object.keys(SETS));
    set = SETS[setKey];
    if (!slot || !set.pieces[slot]) slot = pick(rng, Object.keys(set.pieces));
  }
  slot = slot || pick(rng, SLOTS);
  const base = set ? set.pieces[slot] : pick(rng, BASES[slot]);
  const keys = [SLOT_PRIMARY[slot]];
  const pool = Object.keys(AFFIX_RANGE).filter(k => k !== keys[0]);
  while (keys.length < R.affixes) {
    const k = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    keys.push(k);
  }
  const stats = {};
  for (const k of keys) {
    const [lo, hi] = AFFIX_RANGE[k];
    let v = roll(rng, lo, hi) * R.power * level;
    if (k === 'critMult') v = Math.max(1, Math.round(v)) / 4;
    else if (k === 'maxHp' || k === 'damage') v = Math.max(10, Math.round(v / 10) * 10);
    else v = Math.max(1, Math.round(v));
    stats[k] = v;
  }
  let name;
  if (set) name = base;
  else if (rarity === 'legendary') {
    if (rng() < 0.5) stats.dice = 1; else stats.cleave = 1;
    name = pick(rng, LEGEND);
  } else if (rarity === 'rare') name = `${pick(rng, PREFIX)} ${base} ${pick(rng, SUFFIX)}`;
  else if (rarity === 'magic') name = rng() < 0.5 ? `${pick(rng, PREFIX)} ${base}` : `${base} ${pick(rng, SUFFIX)}`;
  else name = `Iron ${base}`;
  const it = { id: uid(rng), name, base, slot, rarity, stats };
  if (set) it.set = setKey;
  return it;
}

export function randomRarity(rng = Math.random) {
  const r = rng();
  return r < 0.43 ? 'common' : r < 0.75 ? 'magic' : r < 0.91 ? 'rare' : r < 0.96 ? 'legendary' : 'set';
}

// ---------------------------------------------------------------- helpers
export function fmt(n) {
  if (typeof n !== 'number') return n;
  return Math.round(n).toLocaleString('en-US');
}

// ---------------------------------------------------------------- sets
export function setCounts(ch) {
  const c = {};
  for (const it of Object.values(ch.gear || {})) if (it?.set) c[it.set] = (c[it.set] || 0) + 1;
  return c;
}
export function activeSynergies(ch, counts = setCounts(ch)) {
  return SYNERGIES.filter(sy => Object.entries(sy.needs).every(([k, n]) => (counts[k] || 0) >= n));
}

function mergeEffects(base, add) {
  const out = base.map(e => ({ ...e }));
  for (const a of add) {
    const t = out.find(e => e.kind === a.kind && (e.who || '') === (a.who || ''));
    if (!t) { out.push({ ...a, ...(a.damageMult ? { damageMult: 1 + a.damageMult } : {}) }); continue; }
    for (const [k, v] of Object.entries(a)) {
      if (typeof v !== 'number') continue;
      t[k] = (t[k] ?? (k === 'damageMult' ? 1 : 0)) + v;
    }
  }
  return out;
}

const whoText = { self: '', party: 'every hero ', others: 'every other hero ' };
export function describeEffects(effects) {
  return effects.map(e => {
    if (e.kind === 'smite') return `gain ${e.kills} minion-slaying hits`;
    if (e.kind === 'buff') return [e.bonusDice && `+${e.bonusDice} dice`, e.damageMult > 1 && `×${+e.damageMult.toFixed(2)} damage`].filter(Boolean).join(' and ') + ' on your next attack';
    if (e.kind === 'ward') return e.who === 'party' ? `every hero gains a ${fmt(e.amount)} ward` : `gain a ${fmt(e.amount)} ward`;
    if (e.kind === 'heal') return `heal ${e.who === 'party' ? 'every hero' : 'yourself'} for ${e.pct}% of max health`;
    if (e.kind === 'energize') return `${whoText[e.who] || ''}gains ${e.amount} energy`;
    return '';
  }).filter(Boolean).join('; ').replace(/^./, c => c.toUpperCase()) + '.';
}

// Class powers plus any set powers unlocked by equipped pieces (strengthened by synergies).
export function powersFor(ch) {
  const C = CLASSES[ch.cls] || CLASSES.ironclad;
  const out = C.abilities.map(a => ({ ...a, effects: [a.effect] }));
  const counts = setCounts(ch);
  const syn = activeSynergies(ch, counts);
  for (const [k, n] of Object.entries(counts)) {
    const P = SETS[k].power;
    let effects = P.effects(n), cost = P.cost;
    const boosted = [];
    for (const sy of syn) {
      const m = sy.mods?.[P.key];
      if (!m) continue;
      if (m.add) effects = mergeEffects(effects, m.add);
      if (m.cost) cost += m.cost;
      boosted.push(sy.name);
    }
    out.push({ key: P.key, name: P.name, cost: Math.max(5, cost), text: describeEffects(effects), effects, set: k, pieces: n, boosted });
  }
  return out;
}

// Everything a hero has unlocked from gear, as stable keys (used for "discovered!" moments).
function unlockKeys(ch) {
  const counts = setCounts(ch);
  const keys = [];
  for (const [k, n] of Object.entries(counts)) for (let i = 1; i <= n; i++) keys.push(`set:${k}:${i}`);
  for (const sy of activeSynergies(ch, counts)) keys.push(`syn:${sy.key}`);
  return keys;
}
function unlockEvent(ch, key) {
  const [kind, id, n] = key.split(':');
  if (kind === 'syn') {
    const sy = SYNERGIES.find(x => x.key === id);
    return { type: 'unlock', charId: ch.id, kind: 'synergy', name: sy.name, text: synergyText(sy) };
  }
  const S = SETS[id], pw = powersFor(ch).find(p => p.key === S.power.key);
  const bonus = S.bonuses.find(b => b.n === Number(n));
  const parts = [];
  if (Number(n) === 1) parts.push(pw?.text || '');
  else parts.push(`${S.power.name} grows stronger (${n} pieces).`);
  if (bonus) parts.push(statsText(bonus.stats));
  return { type: 'unlock', charId: ch.id, kind: Number(n) === 1 ? 'power' : 'tier', set: id, name: Number(n) === 1 ? S.power.name : `${S.name} ×${n}`, text: parts.join(' ') };
}
export function statsText(stats) {
  return Object.entries(stats).map(([k, v]) => `${STAT_INFO[k].fmt(v)} ${STAT_INFO[k].label}`).join(', ');
}
export function synergyText(sy) {
  const parts = [];
  if (sy.stats) parts.push(statsText(sy.stats));
  for (const [pk, m] of Object.entries(sy.mods || {})) {
    const setKey = pk.split(':')[1], nm = SETS[setKey].power.name;
    if (m.add) parts.push(`${nm} also: ${describeEffects(m.add).replace(/\.$/, '').toLowerCase()}`);
    if (m.cost) parts.push(`${nm} costs ${-m.cost} less energy`);
  }
  return parts.join('. ') + '.';
}

export function derive(ch) {
  const C = CLASSES[ch.cls] || CLASSES.ironclad;
  const s = { ...C.base };
  const add = stats => { for (const [k, v] of Object.entries(stats)) s[k] = (s[k] || 0) + v; };
  for (const it of Object.values(ch.gear || {})) if (it) add(it.stats);
  const counts = setCounts(ch);
  for (const [k, n] of Object.entries(counts)) for (const b of SETS[k].bonuses) if (n >= b.n) add(b.stats);
  for (const sy of activeSynergies(ch, counts)) if (sy.stats) add(sy.stats);
  s.armor = Math.min(s.armor, 75);
  s.pool = s.dice + (ch.buffs?.bonusDice || 0);
  return s;
}

// Defense: the hero rolls one die per enemy attack; low rolls are blows that land.
// Heavy armor (30%+) narrows that window from 1–3 to 1–2.
export const landOn = s => (s.armor >= 30 ? 2 : 3);

// ---------------------------------------------------------------- foe abilities
// Presets the app runs by itself. `when`: half (once, at ≤50% health), round
// (every End round), phase (enemy phase), passive, death.
export const FOE_ABILITIES = {
  enrage: { name: 'Enrage', icon: '♨', when: 'half', text: 'At half health: +1 attack and +50% damage per blow.', tag: 'Enraged' },
  stoneskin: { name: 'Stoneskin', icon: '◆', when: 'half', text: 'At half health: +20% armor.', tag: 'Hardened' },
  horde: { name: 'Call the Horde', icon: '⚑', when: 'half', text: 'At half health: 2 minions rush every hero.', tag: 'Horde called' },
  summoner: { name: 'Summoner', icon: '☠', when: 'round', text: 'Every End round: 2 minions join the fight.' },
  regen: { name: 'Regenerate', icon: '✚', when: 'round', text: 'Every End round: heals 5% of its max health.' },
  sweep: { name: 'Sweeping Blows', icon: '⟲', when: 'phase', text: 'Enemy phase: attacks every standing hero, not just the one it is fighting.' },
  leech: { name: 'Energy Leech', icon: 'ϟ', when: 'phase', text: 'Enemy phase: every hero it attacks loses 10 energy.' },
  thickhide: { name: 'Thick Hide', icon: '⛊', when: 'passive', text: '6s never crit it.' },
  throes: { name: 'Death Throes', icon: '✹', when: 'death', text: 'On death: explodes for 300 damage to every hero (armor applies).' },
};
export const foeHas = (e, k) => (e.abilities || []).includes(k);

function foeAnnounce(state, e, key, ev, detail) {
  const A = FOE_ABILITIES[key];
  ev.push({ type: 'foeAbility', enemyId: e.id, enemyName: e.name, key, name: A.name, text: detail || A.text });
  log(state, `${A.icon} ${e.name}: ${A.name}! ${detail || ''}`.trim(), 'hurt');
}

function spawnMinionsFor(state, n, targets, rng) {
  const heroes = targets.filter(id => state.characters[id]?.hp > 0);
  const T = ENEMY_TYPES.minion;
  for (let i = 0; i < n; i++) {
    const e = { id: uid(rng), type: 'minion', name: 'Minion', hp: 1, maxHp: 1, armor: 0, damage: T.damage, attacks: 1, ability: '', target: heroes.length ? heroes[i % heroes.length] : null };
    state.enemies[e.id] = e;
  }
  const per = {};
  for (let i = 0; i < n && heroes.length; i++) per[heroes[i % heroes.length]] = (per[heroes[i % heroes.length]] || 0) + 1;
  return Object.entries(per).map(([target, count]) => ({ type: 'spawn', target, count }));
}

// After a foe takes damage (still alive): half-health triggers fire once.
function foeDamaged(state, e, ev, rng) {
  if (e.hp <= 0 || e.hp > e.maxHp / 2) return;
  e.fired ||= [];
  for (const key of ['enrage', 'stoneskin', 'horde']) {
    if (!foeHas(e, key) || e.fired.includes(key)) continue;
    e.fired.push(key);
    if (key === 'enrage') { e.attacks = (e.attacks || 1) + 1; e.damage = Math.round(e.damage * 1.5); foeAnnounce(state, e, key, ev, `Now ${e.attacks} attacks of ${fmt(e.damage)}.`); }
    if (key === 'stoneskin') { e.armor = Math.min(75, (e.armor || 0) + 20); foeAnnounce(state, e, key, ev, `Armor rises to ${e.armor}%.`); }
    if (key === 'horde') {
      const heroes = state.order.filter(id => state.characters[id].hp > 0);
      ev.push(...spawnMinionsFor(state, heroes.length * 2, heroes, rng));
      foeAnnounce(state, e, key, ev, `${heroes.length * 2} minions rush the heroes!`);
    }
  }
}

// A foe has just died.
function foeDied(state, e, ev) {
  if (!foeHas(e, 'throes')) return;
  const hit = [];
  for (const id of state.order) {
    const c = state.characters[id];
    if (c.hp <= 0) continue;
    const r = hurt(c, 300);
    ev.push({ type: 'hurt', charId: c.id, ...r });
    hit.push(`${c.name} −${fmt(r.net)}`);
  }
  foeAnnounce(state, e, 'throes', ev, hit.length ? hit.join(', ') + '.' : '');
}

// Every End round.
function foesRoundEnd(state, ev, rng) {
  for (const e of Object.values(state.enemies)) {
    if (foeHas(e, 'regen') && e.hp < e.maxHp) {
      const amt = Math.min(e.maxHp - e.hp, Math.round(e.maxHp * 0.05));
      e.hp += amt;
      foeAnnounce(state, e, 'regen', ev, `Heals ${fmt(amt)} (${fmt(e.hp)} / ${fmt(e.maxHp)}).`);
    }
    if (foeHas(e, 'summoner')) {
      const targets = e.target ? [e.target] : state.order;
      ev.push(...spawnMinionsFor(state, 2, targets, rng));
      foeAnnounce(state, e, 'summoner', ev, `2 minions answer the call.`);
    }
  }
}

// Foes that attack this hero in the enemy phase: those engaged with them, plus any with Sweeping Blows.
function attackersOf(state, ch) {
  return Object.values(state.enemies).filter(e => e.target === ch.id || (foeHas(e, 'sweep') && e.type !== 'minion'));
}

function defenseGroups(state, ch) {
  const groups = new Map();
  for (const e of attackersOf(state, ch)) {
    const key = e.type === 'minion' ? `m:${e.name}:${e.damage}` : e.id;
    const g = groups.get(key) || { name: e.name, type: e.type, count: 0, damage: e.damage, dice: 0 };
    g.count += 1;
    g.dice += e.attacks || ENEMY_TYPES[e.type]?.attacks || 1;
    groups.set(key, g);
  }
  return [...groups.values()];
}

// ---------------------------------------------------------------- foe scaling
// Expected party damage in one round against a foe with `armor`%:
// each die hits on 4+ (1/2), a 6 (1/6) crits; ×1.2 for powers and buffs.
export const POWER_FACTOR = 1.2;
export function partyDamagePerRound(state, armor = 0) {
  let total = 0;
  for (const id of state.order) {
    const s = derive(state.characters[id]);
    total += s.dice * s.damage * (2 / 6 + s.critMult / 6);
  }
  return Math.round(total * (1 - armor / 100) * POWER_FACTOR);
}
// Health that makes a foe last about `rounds` rounds against the current party.
export function scaledHealth(state, rounds = 4, armor = 0) {
  const dpr = partyDamagePerRound(state, armor);
  return Math.max(2000, Math.round(dpr * rounds / 500) * 500);
}
export const SCALE_DEFAULT_ROUNDS = { elite: 2, boss: 4 };

export function engagedWith(state, charId) {
  return Object.values(state.enemies).filter(e => e.target === charId);
}

function log(state, text, kind = 'info') {
  state.log.unshift({ t: Date.now(), text, kind });
  if (state.log.length > 80) state.log.length = 80;
}

function clampChar(ch) {
  const s = derive(ch);
  ch.hp = Math.max(0, Math.min(ch.hp, s.maxHp));
  ch.energy = Math.max(0, Math.min(ch.energy, s.maxEnergy));
}

function gainEnergy(ch, amt) {
  const s = derive(ch);
  const before = ch.energy;
  ch.energy = Math.min(s.maxEnergy, ch.energy + amt);
  return ch.energy - before;
}

function hurt(ch, amount, ignoreArmor = false) {
  const s = derive(ch);
  const blocked = ignoreArmor ? 0 : Math.round(amount * s.armor / 100);
  let net = amount - blocked;
  const warded = Math.min(ch.ward || 0, net);
  ch.ward = (ch.ward || 0) - warded;
  net -= warded;
  ch.hp = Math.max(0, ch.hp - net);
  if (ch.hp <= 0) delete ch.strike;
  return { net, blocked, warded };
}

export function strikeLeft(ch) {
  const st = ch.strike;
  return st ? (st.hits || 0) + (st.crits || 0) + (st.minion || 0) : 0;
}

// ---------------------------------------------------------------- state
export function newGame(code) {
  return { code, round: 1, characters: {}, order: [], enemies: {}, loot: {}, defense: {}, log: [], rev: 0, created: Date.now() };
}

export function newCharacter(name, cls, rng = Math.random) {
  cls = CLASSES[cls] ? cls : 'ironclad';
  const ch = { id: uid(rng), name: String(name || 'Hero').slice(0, 24), cls, hp: 0, energy: 0, ward: 0, kills: 0, gear: {}, bag: [], buffs: {} };
  const s = derive(ch);
  ch.hp = s.maxHp;
  ch.energy = 20;
  return ch;
}

const GM_ONLY = new Set(['moveMinions', 'enemyPhase', 'cancelDefense', 'hurt', 'heal', 'energy', 'spawn', 'removeEnemy', 'moveEnemy', 'damageEnemy', 'endRound', 'giveLoot', 'makeLootCards', 'clearLootCards', 'planCampaign', 'voidCard', 'editCharacter', 'removeCharacter', 'clearEnemies', 'enemyStrike', 'editEnemy', 'rescaleEnemy']);
export const isGmOnly = type => GM_ONLY.has(type);

// Apply one action. Mutates `state`. Returns { events, error, result }.
export function apply(state, a, rng = Math.random) {
  const ev = [];
  const ch = a.charId ? state.characters[a.charId] : null;
  const need = () => { if (!ch) throw new Error('No such hero'); };
  let out;
  try {
    out = applyInner();
  } catch (err) {
    return { error: err.message, events: [] };
  }
  // Discoveries: set powers, set tiers and hidden synergies, announced the first time.
  for (const id of state.order) {
    const c = state.characters[id];
    c.found ||= [];
    for (const key of unlockKeys(c)) {
      if (c.found.includes(key)) continue;
      c.found.push(key);
      const e = unlockEvent(c, key);
      out.events.push(e);
      log(state, e.kind === 'synergy' ? `✦ ${c.name} discovers a hidden synergy: ${e.name}!` : e.kind === 'power' ? `✦ ${c.name} unlocks ${e.name}!` : `✦ ${c.name}'s ${e.name} set grows stronger.`, 'ability');
    }
  }
  return out;

  function applyInner() {
    switch (a.type) {
      case 'createCharacter': {
        if (state.order.length >= 8) throw new Error('The party is full');
        const c = newCharacter(a.name, a.cls, rng);
        state.characters[c.id] = c; state.order.push(c.id);
        log(state, `${c.name} the ${CLASSES[c.cls].name} joins the delve.`, 'join');
        return { events: [{ type: 'join', charId: c.id }], result: { charId: c.id } };
      }
      case 'editCharacter': {
        need();
        if (a.name != null) ch.name = String(a.name).slice(0, 24);
        if (a.cls && CLASSES[a.cls]) ch.cls = a.cls;
        if (a.hp != null) ch.hp = Number(a.hp) || 0;
        if (a.energy != null) ch.energy = Number(a.energy) || 0;
        if (a.ward != null) ch.ward = Math.max(0, Number(a.ward) || 0);
        clampChar(ch);
        break;
      }
      case 'removeCharacter': {
        need();
        delete state.characters[ch.id];
        state.order = state.order.filter(id => id !== ch.id);
        for (const e of Object.values(state.enemies)) if (e.target === ch.id) e.target = null;
        log(state, `${ch.name} leaves the party.`);
        break;
      }
      case 'attack': { // roll → bank a pool of hits to spend by tapping foes
        need();
        if (ch.hp <= 0) throw new Error(`${ch.name} is down`);
        if (strikeLeft(ch) && !a.force) throw new Error('Spend your remaining hits first');
        const s = derive(ch);
        const hits = Math.max(0, Math.min(Number(a.hits) || 0, s.pool));
        const sixes = Math.max(0, Math.min(Number(a.sixes) || 0, hits));
        const minion = (ch.strike?.minion || 0) + sixes * s.cleave;
        ch.strike = { hits: hits - sixes, crits: sixes, minion, mult: ch.buffs.damageMult || 1 };
        ch.buffs = {};
        ev.push({ type: 'rolled', charId: ch.id, hits, sixes });
        log(state, hits ? `${ch.name} rolls ${hits} hit${hits === 1 ? '' : 's'}${sixes ? ` (${sixes} crit${sixes > 1 ? 's' : ''})` : ''}.` : `${ch.name} rolls and misses.`, 'hit');
        break;
      }
      case 'spend': { // tap a foe: spend one hit on it ('table' = an untracked minion on the board)
        need();
        if (ch.hp <= 0) throw new Error(`${ch.name} is down`);
        const st = ch.strike || {};
        if (!strikeLeft(ch)) throw new Error('No hits left. Roll an attack first');
        const s = derive(ch);
        const e = a.enemyId === 'table' ? null : state.enemies[a.enemyId];
        if (a.enemyId !== 'table' && !e) throw new Error('That foe is already gone');
        if (!e || e.type === 'minion') {
          if (st.minion) st.minion--; else if (st.hits) st.hits--; else st.crits--;
          if (e) delete state.enemies[e.id];
          ch.kills += 1;
          const energy = gainEnergy(ch, s.energyPerKill);
          ev.push({ type: 'kills', charId: ch.id, kills: 1, energy, left: strikeLeft(ch) });
          log(state, `${ch.name} slays ${e ? 'a ' + e.name : 'a minion'}. (+${energy} energy)`, 'kill');
        } else {
          if (!st.hits && !st.crits) throw new Error('Those hits only work on minions');
          const crit = st.crits > 0;
          if (crit) st.crits--; else st.hits--;
          const raw = s.damage * (crit && !foeHas(e, 'thickhide') ? s.critMult : 1) * (st.mult || 1);
          const dmg = Math.round(raw * (1 - (e.armor || 0) / 100));
          e.hp = Math.max(0, e.hp - dmg);
          let energy = 0;
          if (e.hp <= 0) {
            delete state.enemies[e.id];
            ch.kills += 1;
            energy = gainEnergy(ch, s.energyPerKill * (ENEMY_TYPES[e.type]?.energyMult || 1));
            log(state, `${ch.name} ${crit ? 'crits' : 'hits'} for ${fmt(dmg)} and fells ${e.name}! (+${energy} energy)`, 'kill');
          } else log(state, `${ch.name} ${crit ? 'crits' : 'hits'} ${e.name} for ${fmt(dmg)}.`, 'hit');
          ev.push({ type: 'strike', charId: ch.id, enemyId: e.id, enemyName: e.name, damage: dmg, crit, slain: e.hp <= 0, energy, left: strikeLeft(ch) });
          if (e.hp <= 0) foeDied(state, e, ev); else foeDamaged(state, e, ev, rng);
        }
        if (!strikeLeft(ch)) delete ch.strike;
        break;
      }
      case 'endAttack': { need(); delete ch.strike; break; }
      case 'ability': {
        need();
        if (ch.hp <= 0) throw new Error(`${ch.name} is down`);
        const ab = powersFor(ch).find(x => x.key === a.key);
        if (!ab) throw new Error('Unknown ability');
        if (ch.energy < ab.cost) throw new Error('Not enough energy');
        ch.energy -= ab.cost;
        const others = state.order.map(id => state.characters[id]).filter(c => c.id !== ch.id);
        const party = [ch, ...others];
        let detail = '';
        for (const f of ab.effects) {
        if (f.kind === 'buff') {
          ch.buffs.bonusDice = (ch.buffs.bonusDice || 0) + (f.bonusDice || 0);
          ch.buffs.damageMult = Math.max(ch.buffs.damageMult || 1, f.damageMult || 1);
          ch.buffs.label = ab.name;
        } else if (f.kind === 'ward') {
          for (const c of f.who === 'party' ? party : [ch]) c.ward = (c.ward || 0) + f.amount;
        } else if (f.kind === 'heal') {
          for (const c of f.who === 'party' ? party : [ch]) {
            if (c.hp <= 0 && c.id !== ch.id) continue;
            const m = derive(c).maxHp;
            c.hp = Math.min(m, c.hp + Math.round(m * f.pct / 100));
          }
        } else if (f.kind === 'energize') {
          for (const c of f.who === 'others' ? others : party) gainEnergy(c, f.amount);
        } else if (f.kind === 'smite') {
          ch.strike = ch.strike || { hits: 0, crits: 0, minion: 0, mult: 1 };
          ch.strike.minion += f.kills;
          detail = ` — ${f.kills} minion-slaying hits`;
        }
        }
        ev.unshift({ type: 'ability', charId: ch.id, name: ab.name });
        log(state, `${ch.name} unleashes ${ab.name}${detail}.`, 'ability');
        break;
      }
      case 'hurt': {
        need();
        const r = hurt(ch, Math.max(0, Number(a.amount) || 0), !!a.ignoreArmor);
        ev.push({ type: 'hurt', charId: ch.id, ...r });
        log(state, `${ch.name} takes ${fmt(r.net)} damage${r.blocked ? ` (${fmt(r.blocked)} blocked)` : ''}${r.warded ? ` (${fmt(r.warded)} warded)` : ''}.${ch.hp <= 0 ? ' DOWN!' : ''}`, 'hurt');
        break;
      }
      case 'enemyStrike': { // every foe engaged with a hero hits once (GM decides hits)
        need();
        const n = Math.max(0, Number(a.hits) || 0);
        const per = Number(a.per) || ENEMY_TYPES.minion.damage;
        const r = hurt(ch, n * per);
        ev.push({ type: 'hurt', charId: ch.id, ...r });
        log(state, `${n} blow${n === 1 ? '' : 's'} land on ${ch.name}: ${fmt(r.net)} damage.${ch.hp <= 0 ? ' DOWN!' : ''}`, 'hurt');
        break;
      }
      case 'heal': {
        need();
        const m = derive(ch).maxHp;
        const amt = a.full ? m : Math.max(0, Number(a.amount) || 0);
        const before = ch.hp;
        ch.hp = Math.min(m, ch.hp + amt);
        ev.push({ type: 'heal', charId: ch.id, amount: ch.hp - before });
        log(state, `${ch.name} is healed for ${fmt(ch.hp - before)}.`, 'heal');
        break;
      }
      case 'energy': {
        need();
        const d = Number(a.amount) || 0;
        if (d >= 0) gainEnergy(ch, d); else ch.energy = Math.max(0, ch.energy + d);
        break;
      }
      case 'spawn': {
        const T = ENEMY_TYPES[a.etype] || ENEMY_TYPES.minion;
        const n = Math.max(1, Math.min(Number(a.count) || 1, 30));
        const armor = a.armor != null && a.armor !== '' ? Math.max(0, Math.min(90, Number(a.armor) || 0)) : T.armor;
        const scale = a.etype !== 'minion' && Number(a.scale) > 0 && state.order.length ? Math.min(Number(a.scale), 20) : 0;
        const hp = scale ? scaledHealth(state, scale, armor) : Number(a.hp) || T.hp;
        for (let i = 0; i < n; i++) {
          const e = { id: uid(rng), type: a.etype in ENEMY_TYPES ? a.etype : 'minion', name: a.name || T.label, hp, maxHp: hp, armor, ...(scale ? { scaleRounds: scale } : {}), damage: Number(a.damage) || T.damage, attacks: Number(a.attacks) || T.attacks, ability: a.ability ? String(a.ability).slice(0, 140) : '', abilities: a.etype === 'minion' ? [] : (a.abilities || []).filter(k => FOE_ABILITIES[k]), target: a.target || null };
          state.enemies[e.id] = e;
        }
        const who = a.target && state.characters[a.target] ? ` upon ${state.characters[a.target].name}` : '';
        log(state, `${n} ${a.name || T.label}${n > 1 ? 's' : ''} emerge${n > 1 ? '' : 's'}${who}!${scale ? ` (${fmt(hp)} health, scaled to the party)` : ''}`, 'spawn');
        ev.push({ type: 'spawn', target: a.target, count: n });
        break;
      }
      case 'removeEnemy': delete state.enemies[a.enemyId]; break;
      case 'rescaleEnemy': { // re-fit a living foe to the party as it is now, keeping its health %
        const e = state.enemies[a.enemyId];
        if (!e) throw new Error('That foe is gone');
        const rounds = Math.min(Number(a.rounds) || e.scaleRounds || SCALE_DEFAULT_ROUNDS[e.type] || 4, 20);
        const frac = e.hp / e.maxHp;
        e.maxHp = scaledHealth(state, rounds, e.armor || 0);
        e.hp = Math.max(1, Math.round(e.maxHp * frac));
        e.scaleRounds = rounds;
        log(state, `${e.name} rises to meet the party: ${fmt(e.hp)} / ${fmt(e.maxHp)} health.`, 'spawn');
        break;
      }
      case 'editEnemy': {
        const e = state.enemies[a.enemyId];
        if (!e) break;
        for (const k of ['armor', 'damage', 'attacks', 'hp', 'maxHp']) if (a[k] != null && a[k] !== '') e[k] = Math.max(0, Number(a[k]) || 0);
        if (a.name) e.name = String(a.name).slice(0, 40);
        if (a.ability != null) e.ability = String(a.ability).slice(0, 140);
        if (Array.isArray(a.abilities)) e.abilities = a.abilities.filter(k => FOE_ABILITIES[k]);
        e.hp = Math.min(e.hp, e.maxHp);
        break;
      }
      case 'moveMinions': {
        const from = a.from || null, to = a.to || null;
        const pool = Object.values(state.enemies).filter(e => e.type === 'minion' && (e.target || null) === from);
        const n = Math.max(0, Math.min(Number(a.count) || 0, pool.length));
        for (const e of pool.slice(0, n)) e.target = to;
        const nm = id => (id ? state.characters[id]?.name || '?' : 'the shadows');
        if (n) log(state, `${n} minion${n === 1 ? '' : 's'} turn${n === 1 ? 's' : ''} from ${nm(from)} to ${nm(to)}.`, 'spawn');
        if (n && to) ev.push({ type: 'spawn', target: to, count: n });
        break;
      }
      case 'enemyPhase': {
        state.defense = {};
        const targets = [];
        for (const id of state.order) {
          const c = state.characters[id];
          if (c.hp <= 0) continue;
          const groups = defenseGroups(state, c);
          if (!groups.length) continue;
          state.defense[id] = { id: uid(rng), groups, landOn: landOn(derive(c)) };
          targets.push(id);
          for (const e of attackersOf(state, c).filter(x => foeHas(x, 'leech'))) {
            const lost = Math.min(c.energy, 10);
            c.energy -= lost;
            if (lost) foeAnnounce(state, e, 'leech', ev, `${c.name} loses ${lost} energy.`);
          }
        }
        if (!targets.length) throw new Error('No foes are engaged with any standing hero');
        log(state, `⚔ The foes attack! ${targets.map(id => state.characters[id].name).join(', ')} must defend.`, 'hurt');
        ev.push({ type: 'enemyPhase', targets });
        break;
      }
      case 'defend': {
        need();
        const d = state.defense?.[ch.id];
        if (!d) throw new Error('No attack to defend against');
        const landed = d.groups.map((g, i) => Math.max(0, Math.min(Number(a.landed?.[i]) || 0, g.dice)));
        const raw = d.groups.reduce((sum, g, i) => sum + landed[i] * g.damage, 0);
        const blows = landed.reduce((x, y) => x + y, 0);
        delete state.defense[ch.id];
        if (!blows) {
          ev.push({ type: 'defended', charId: ch.id });
          log(state, `${ch.name} turns aside every blow!`, 'heal');
          break;
        }
        const r = hurt(ch, raw);
        ev.push({ type: 'hurt', charId: ch.id, ...r });
        log(state, `${blows} blow${blows === 1 ? ' lands' : 's land'} on ${ch.name}: ${fmt(r.net)} damage${r.blocked ? ` (${fmt(r.blocked)} blocked)` : ''}${r.warded ? ` (${fmt(r.warded)} warded)` : ''}.${ch.hp <= 0 ? ' DOWN!' : ''}`, 'hurt');
        break;
      }
      case 'cancelDefense': {
        if (state.defense) { if (a.charId) delete state.defense[a.charId]; else state.defense = {}; }
        break;
      }
      case 'clearEnemies': {
        for (const e of Object.values(state.enemies)) if (!a.target || e.target === a.target) delete state.enemies[e.id];
        break;
      }
      case 'moveEnemy': {
        const e = state.enemies[a.enemyId];
        if (e) e.target = a.target || null;
        break;
      }
      case 'damageEnemy': {
        const e = state.enemies[a.enemyId];
        if (!e) break;
        e.hp = Math.max(0, Math.min(e.maxHp, e.hp - (Number(a.amount) || 0)));
        if (e.hp <= 0) { delete state.enemies[e.id]; log(state, `${e.name} falls.`, 'kill'); foeDied(state, e, ev); }
        else foeDamaged(state, e, ev, rng);
        break;
      }
      case 'endRound': {
        for (const id of state.order) {
          const c = state.characters[id];
          delete c.strike;
          if (c.hp > 0) gainEnergy(c, derive(c).energyPerRound);
        }
        state.round += 1;
        log(state, `— Round ${state.round} begins. Energy surges. —`, 'round');
        ev.push({ type: 'round', round: state.round });
        foesRoundEnd(state, ev, rng);
        break;
      }
      case 'giveLoot': {
        need();
        const rarity = a.rarity === 'random' || !a.rarity ? randomRarity(rng) : a.rarity;
        const item = makeItem(rarity, rng, a.slot);
        ch.bag.push(item);
        ev.push({ type: 'loot', charId: ch.id, item });
        log(state, `${ch.name} finds ${item.name} (${RARITIES[item.rarity].label}).`, 'loot');
        break;
      }
      case 'makeLootCards': { // loose cards: each holds `per` random items
        const n = Math.max(1, Math.min(Number(a.count) || 1, 40));
        const per = Math.max(1, Math.min(Number(a.per) || 1, 6));
        for (let i = 0; i < n; i++) {
          const items = Array.from({ length: per }, () => makeItem(a.rarity === 'random' || !a.rarity ? randomRarity(rng) : a.rarity, rng, undefined, Number(a.level) || 1));
          const card = newCardCode(state, rng);
          state.loot[card] = { card, kind: per > 1 ? 'chest' : 'single', label: per > 1 ? 'Treasure chest' : 'Treasure', items };
        }
        break;
      }
      case 'planCampaign': {
        const r = planCampaign(state, a, rng);
        return { events: [], result: r };
      }
      case 'clearLootCards': {
        if (a.scene === undefined) state.loot = {};
        else for (const [k, c] of Object.entries(state.loot)) if (String(c.sceneIdx) === String(a.scene)) delete state.loot[k];
        break;
      }
      case 'voidCard': delete state.loot[a.card]; break;
      case 'claimLoot': {
        need();
        const c = state.loot[String(a.card || '').toUpperCase().trim()];
        if (!c) throw new Error('That treasure has already been claimed');
        delete state.loot[c.card];
        const items = c.items || [c]; // older cards held a single item
        for (const it of items) { delete it.card; ch.bag.push(it); }
        if (items.length === 1) ev.push({ type: 'loot', charId: ch.id, item: items[0] });
        else ev.push({ type: 'cache', charId: ch.id, items, label: c.label, kind: c.kind });
        log(state, items.length === 1 ? `${ch.name} claims ${items[0].name} (${RARITIES[items[0].rarity].label})!` : `${ch.name} opens ${c.label || 'a cache'}: ${items.map(i => i.name).join(', ')}.`, 'loot');
        break;
      }
      case 'equip': {
        need();
        const i = ch.bag.findIndex(x => x.id === a.itemId);
        if (i < 0) throw new Error('Item not found');
        const it = ch.bag.splice(i, 1)[0];
        const old = ch.gear[it.slot];
        ch.gear[it.slot] = it;
        if (old) ch.bag.push(old);
        const before = ch.hp;
        clampChar(ch);
        // New max health from gear arrives "topped up" by the difference.
        const dMax = (it.stats.maxHp || 0) - (old?.stats.maxHp || 0);
        if (dMax > 0) ch.hp = Math.min(derive(ch).maxHp, before + dMax);
        log(state, `${ch.name} equips ${it.name}.`);
        break;
      }
      case 'unequip': {
        need();
        const it = ch.gear[a.slot];
        if (it) { delete ch.gear[a.slot]; ch.bag.push(it); clampChar(ch); }
        break;
      }
      case 'giveItem': {
        need();
        const to = state.characters[a.to];
        if (!to || to.id === ch.id) throw new Error('Choose another hero');
        let it = null;
        const i = ch.bag.findIndex(x => x.id === a.itemId);
        if (i >= 0) it = ch.bag.splice(i, 1)[0];
        else {
          const slot = Object.keys(ch.gear).find(k => ch.gear[k]?.id === a.itemId);
          if (slot) { it = ch.gear[slot]; delete ch.gear[slot]; clampChar(ch); }
        }
        if (!it) throw new Error('Item not found');
        to.bag.push(it);
        ev.push({ type: 'loot', charId: to.id, item: it, from: ch.name });
        log(state, `${ch.name} gives ${it.name} to ${to.name}.`, 'loot');
        break;
      }
      case 'discard': {
        need();
        ch.bag = ch.bag.filter(x => x.id !== a.itemId);
        break;
      }
      default: throw new Error('Unknown action ' + a.type);
    }
    return { events: ev };
  }
}

function newCardCode(state, rng) {
  let c;
  do c = Array.from({ length: 6 }, () => 'ACDEFGHJKMNPQRTUVWXY34679'[Math.floor(rng() * 25)]).join(''); while (state.loot[c]);
  return c;
}

// ---------------------------------------------------------------- campaign planner
// Spreads set pieces across the whole campaign so powers unlock early and sets
// fill in as the party goes deeper; everything else is random, with rarity and
// item power climbing scene by scene.
export const CACHE_DEFAULTS = { chest: 2, elite: 2, boss: 4 };
export const SET_SHARE = 0.45; // share of all campaign items that are set pieces
export const autoFeatured = party => Math.min(Object.keys(SETS).length, Math.max(3, party + 1));
// How a campaign of `items` items with `want` featured sets will play out.
export function setPlanFor(items, want) {
  const budget = Math.floor(items * SET_SHARE);
  let sets = Math.max(1, Math.min(want, Object.keys(SETS).length));
  while (sets > 1 && sets * 2 > budget) sets--;
  const spare = Math.max(0, budget - sets * 2);
  const pieces = Math.min(budget, sets * 2 + Math.min(spare, sets * 2));
  const complete = Math.min(sets, Math.floor(spare / 2));
  return { sets, pieces, complete };
}

export function planCampaign(state, a, rng = Math.random) {
  const scenes = (a.scenes || []).slice(0, 12).map((sc, i) => ({
    name: String(sc.name || `Scene ${i + 1}`).slice(0, 40),
    chests: Math.max(0, Math.min(Number(sc.chests) || 0, 12)),
    elites: (sc.elites || []).slice(0, 8).map(x => String(x || 'Elite').slice(0, 40)),
    bosses: (sc.bosses || []).slice(0, 4).map(x => String(x || 'Boss').slice(0, 40)),
  }));
  if (!scenes.length) throw new Error('Add at least one scene');
  const per = { ...CACHE_DEFAULTS, ...(a.per || {}) };
  for (const k of Object.keys(per)) per[k] = Math.max(1, Math.min(Number(per[k]) || CACHE_DEFAULTS[k], 6));
  const classes = (a.classes?.length ? a.classes : state.order.map(id => state.characters[id].cls)).filter(c => CLASSES[c]);
  const party = Math.max(1, classes.length || 4);

  // 1. pick featured sets: GM-pinned sets first, then each hero's favourite, their second picks, then the rest
  const featured = (a.pinned || []).filter(k => SETS[k]).filter((k, i, arr) => arr.indexOf(k) === i);
  const pinnedCount = featured.length;
  for (const rank of [0, 1]) for (const c of classes) { const k = CLASS_SETS[c]?.[rank]; if (k && !featured.includes(k)) featured.push(k); }
  const rest = Object.keys(SETS).filter(k => !featured.includes(k)).sort(() => rng() - 0.5);
  const want = Math.max(pinnedCount, Math.min(Object.keys(SETS).length, Number(a.featuredCount) || autoFeatured(party)));
  while (featured.length < want && rest.length) featured.push(rest.shift());
  featured.length = Math.min(featured.length, want);

  // 2. caches and item slots per scene
  const sceneCaches = scenes.map((sc, si) => [
    ...Array.from({ length: sc.chests }, (_, i) => ({ kind: 'chest', label: `${sc.name} · Chest ${i + 1}` })),
    ...sc.elites.map(n => ({ kind: 'elite', label: n })),
    ...sc.bosses.map(n => ({ kind: 'boss', label: n })),
  ].map(c => ({ ...c, sceneIdx: si, scene: sc.name, slots: per[c.kind] })));
  const sceneSlots = sceneCaches.map(cs => cs.reduce((t, c) => t + c.slots, 0));
  const totalSlots = sceneSlots.reduce((x, y) => x + y, 0);
  if (!totalSlots) throw new Error('Add some chests, elites or bosses');

  // 3. set-piece budget: every featured set gets 2+ pieces (power + an upgrade),
  //    then the party's favourite sets are completed first; queue releases each
  //    set's first piece before any second piece, and so on.
  let budget = Math.floor(totalSlots * SET_SHARE);
  while (featured.length > 1 && featured.length * 2 > budget) featured.pop();
  const cap = Object.fromEntries(featured.map(k => [k, Math.min(2, budget)]));
  let spare = Math.max(0, budget - featured.length * 2);
  for (const k of featured) { const extra = Math.min(2, spare); cap[k] += extra; spare -= extra; }
  const queue = [];
  const pieceOrder = Object.fromEntries(featured.map(k => [k, Object.keys(SETS[k].pieces).sort(() => rng() - 0.5)]));
  for (let r = 0; r < 4; r++) for (const k of [...featured].sort(() => rng() - 0.5)) if (r < cap[k]) queue.push({ set: k, slot: pieceOrder[k][r] });
  const setBudget = queue.length;

  // 4. hand set pieces to scenes in proportion to their slots (early scenes get the first pieces)
  let qi = 0, slotsSeen = 0;
  const removed = Object.keys(state.loot).filter(k => state.loot[k].plan);
  for (const k of removed) delete state.loot[k];
  const summary = [];
  scenes.forEach((sc, si) => {
    slotsSeen += sceneSlots[si];
    let upto = si === scenes.length - 1 ? setBudget : Math.round(setBudget * slotsSeen / totalSlots);
    if (si === 0) upto = Math.max(upto, Math.min(featured.length, Math.floor(sceneSlots[0] * 0.6)));
    upto = Math.min(setBudget, Math.max(upto, qi));
    const pieces = queue.slice(qi, upto); qi = upto;
    const progress = scenes.length > 1 ? si / (scenes.length - 1) : 0;
    const level = 1 + 0.25 * si;
    const slots = [];
    sceneCaches[si].forEach((c, ci) => { for (let j = 0; j < c.slots; j++) slots.push({ ci, j }); });
    // spread set pieces: shuffle slots, then bosses/elites slightly favoured
    slots.sort(() => rng() - 0.5);
    slots.sort((x, y) => (sceneCaches[si][y.ci].kind !== 'chest') - (sceneCaches[si][x.ci].kind !== 'chest') || 0);
    const holders = sceneCaches[si].map(() => []);
    const used = new Set();
    // never more than ceil(slots/2) set pieces in one cache
    let pi = 0;
    for (const sl of slots) {
      if (pi >= pieces.length) break;
      const c = sceneCaches[si][sl.ci];
      if (holders[sl.ci].filter(it => it.set).length >= Math.ceil(c.slots / 2)) continue;
      holders[sl.ci].push(makeItem('set', rng, pieces[pi].slot, level, pieces[pi].set));
      used.add(`${sl.ci}:${sl.j}`); pi++;
    }
    for (; pi < pieces.length; pi++) { // overflow: drop into any cache with room
      const ci = holders.findIndex((h, i) => h.length < sceneCaches[si][i].slots);
      if (ci < 0) break;
      holders[ci].push(makeItem('set', rng, pieces[pi].slot, level, pieces[pi].set));
    }
    const weights = { legendary: 0.03 + 0.12 * progress, rare: 0.14 + 0.2 * progress, magic: 0.36 };
    const rollRarity = () => { const x = rng(); return x < weights.legendary ? 'legendary' : x < weights.legendary + weights.rare ? 'rare' : x < weights.legendary + weights.rare + weights.magic ? 'magic' : 'common'; };
    sceneCaches[si].forEach((c, ci) => {
      while (holders[ci].length < c.slots) {
        let r = rollRarity();
        if (c.kind === 'boss' && !holders[ci].some(i => ['rare', 'legendary', 'set'].includes(i.rarity))) r = rng() < 0.4 ? 'legendary' : 'rare';
        holders[ci].push(makeItem(r, rng, undefined, level));
      }
      holders[ci].sort(() => rng() - 0.5);
      const card = newCardCode(state, rng);
      state.loot[card] = { card, kind: c.kind, label: c.label, scene: c.scene, sceneIdx: si, plan: true, items: holders[ci] };
    });
    summary.push({ scene: sc.name, caches: sceneCaches[si].length, items: sceneSlots[si], setPieces: pieces.map(p => SETS[p.set].pieces[p.slot]) });
  });
  state.campaign = { scenes, per, classes, featured, featuredCount: Number(a.featuredCount) || null, pinned: a.pinned || [], generated: Date.now() };
  log(state, `The campaign is planned: ${scenes.length} scene${scenes.length > 1 ? 's' : ''}, ${totalSlots} treasures await.`, 'loot');
  return { featured, summary, totalSlots, setPieces: setBudget };
}
