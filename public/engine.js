// Delvers' Ledger — shared game engine.
// Pure functions over a plain JSON game state. Used by the server (authoritative)
// and by the browser (for derived stats and display). No DOM, no I/O.

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
};
export const RARITY_ORDER = ['common', 'magic', 'rare', 'legendary'];

const BASES = {
  weapon: ['Warhammer', 'Bearded Axe', 'Arbalest', 'Rune Staff', 'Twin Dirks', 'Maul', 'Pick-Axe'],
  helm: ['Great Helm', 'Crested Helm', 'Mask of Iron', 'Coif'],
  armor: ['Hauberk', 'Plate Cuirass', 'Scale Coat', 'Forge Apron'],
  gloves: ['Gauntlets', 'Grips', 'Forge Mitts', 'Bracers'],
  boots: ['Sabatons', 'Tunnel Boots', 'Greaves', 'Stompers'],
  amulet: ['Torc', 'Rune Pendant', 'Medallion', 'Chain of Office'],
  ring: ['Signet', 'Band', 'Ring of Office', 'Knuckle-Ring'],
};
const PREFIX = ['Runeforged', 'Deepstone', 'Emberwrought', 'Gilded', 'Anvil-Struck', 'Mithral-Shod', 'Thane\'s', 'Bronzebound', 'Hearthfire', 'Obsidian'];
const SUFFIX = ['of the Anvil', 'of Deep Halls', 'of the Eighth Gate', 'of Ash and Iron', 'of the Last Vault', 'of Grudges', 'of the Mountain King', 'of Brass Thunder'];
const LEGEND = ['Grudgebearer', 'Hammer of Kazrun', 'The Stonefather\'s Oath', 'Lantern-Eater', 'Dawn Under Mountain', 'Ninth Rivet', 'Kingsfall', 'The Unbroken Seam', 'Ember-Heart', 'Vaultbreaker'];

const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const roll = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1));
export const uid = (rng = Math.random) => Math.floor(rng() * 2 ** 32).toString(36) + Date.now().toString(36).slice(-4);

export function makeItem(rarity = 'magic', rng = Math.random, slot) {
  const R = RARITIES[rarity] || RARITIES.magic;
  slot = slot || pick(rng, SLOTS);
  const base = pick(rng, BASES[slot]);
  const keys = [SLOT_PRIMARY[slot]];
  const pool = Object.keys(AFFIX_RANGE).filter(k => k !== keys[0]);
  while (keys.length < R.affixes) {
    const k = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    keys.push(k);
  }
  const stats = {};
  for (const k of keys) {
    const [lo, hi] = AFFIX_RANGE[k];
    let v = roll(rng, lo, hi) * R.power;
    if (k === 'critMult') v = Math.max(1, Math.round(v)) / 4;
    else if (k === 'maxHp' || k === 'damage') v = Math.max(10, Math.round(v / 10) * 10);
    else v = Math.max(1, Math.round(v));
    stats[k] = v;
  }
  let name;
  if (rarity === 'legendary') {
    if (rng() < 0.5) stats.dice = 1; else stats.cleave = 1;
    name = pick(rng, LEGEND);
  } else if (rarity === 'rare') name = `${pick(rng, PREFIX)} ${base} ${pick(rng, SUFFIX)}`;
  else if (rarity === 'magic') name = rng() < 0.5 ? `${pick(rng, PREFIX)} ${base}` : `${base} ${pick(rng, SUFFIX)}`;
  else name = `Iron ${base}`;
  return { id: uid(rng), name, base, slot, rarity, stats };
}

export function randomRarity(rng = Math.random) {
  const r = rng();
  return r < 0.45 ? 'common' : r < 0.78 ? 'magic' : r < 0.95 ? 'rare' : 'legendary';
}

// ---------------------------------------------------------------- helpers
export function fmt(n) {
  if (typeof n !== 'number') return n;
  return Math.round(n).toLocaleString('en-US');
}

export function derive(ch) {
  const C = CLASSES[ch.cls] || CLASSES.ironclad;
  const s = { ...C.base };
  for (const it of Object.values(ch.gear || {})) {
    if (!it) continue;
    for (const [k, v] of Object.entries(it.stats)) s[k] = (s[k] || 0) + v;
  }
  s.armor = Math.min(s.armor, 75);
  s.pool = s.dice + (ch.buffs?.bonusDice || 0);
  return s;
}

// Defense: the hero rolls one die per enemy attack; low rolls are blows that land.
// Heavy armor (30%+) narrows that window from 1–3 to 1–2.
export const landOn = s => (s.armor >= 30 ? 2 : 3);

function defenseGroups(state, ch) {
  const groups = new Map();
  for (const e of engagedWith(state, ch.id)) {
    const key = e.type === 'minion' ? `m:${e.name}:${e.damage}` : e.id;
    const g = groups.get(key) || { name: e.name, type: e.type, count: 0, damage: e.damage, dice: 0 };
    g.count += 1;
    g.dice += e.attacks || ENEMY_TYPES[e.type]?.attacks || 1;
    groups.set(key, g);
  }
  return [...groups.values()];
}

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

const GM_ONLY = new Set(['moveMinions', 'enemyPhase', 'cancelDefense', 'hurt', 'heal', 'energy', 'spawn', 'removeEnemy', 'moveEnemy', 'damageEnemy', 'endRound', 'giveLoot', 'makeLootCards', 'clearLootCards', 'editCharacter', 'removeCharacter', 'clearEnemies', 'enemyStrike', 'editEnemy']);
export const isGmOnly = type => GM_ONLY.has(type);

// Apply one action. Mutates `state`. Returns { events, error, result }.
export function apply(state, a, rng = Math.random) {
  const ev = [];
  const ch = a.charId ? state.characters[a.charId] : null;
  const need = () => { if (!ch) throw new Error('No such hero'); };
  try {
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
          const raw = s.damage * (crit ? s.critMult : 1) * (st.mult || 1);
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
        }
        if (!strikeLeft(ch)) delete ch.strike;
        break;
      }
      case 'endAttack': { need(); delete ch.strike; break; }
      case 'ability': {
        need();
        if (ch.hp <= 0) throw new Error(`${ch.name} is down`);
        const ab = CLASSES[ch.cls].abilities.find(x => x.key === a.key);
        if (!ab) throw new Error('Unknown ability');
        if (ch.energy < ab.cost) throw new Error('Not enough energy');
        ch.energy -= ab.cost;
        const f = ab.effect;
        const others = state.order.map(id => state.characters[id]).filter(c => c.id !== ch.id);
        const party = [ch, ...others];
        let detail = '';
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
        const hp = Number(a.hp) || T.hp;
        for (let i = 0; i < n; i++) {
          const e = { id: uid(rng), type: a.etype in ENEMY_TYPES ? a.etype : 'minion', name: a.name || T.label, hp, maxHp: hp, armor: a.armor != null && a.armor !== '' ? Math.max(0, Math.min(90, Number(a.armor) || 0)) : T.armor, damage: Number(a.damage) || T.damage, attacks: Number(a.attacks) || T.attacks, ability: a.ability ? String(a.ability).slice(0, 140) : '', target: a.target || null };
          state.enemies[e.id] = e;
        }
        const who = a.target && state.characters[a.target] ? ` upon ${state.characters[a.target].name}` : '';
        log(state, `${n} ${a.name || T.label}${n > 1 ? 's' : ''} emerge${n > 1 ? '' : 's'}${who}!`, 'spawn');
        ev.push({ type: 'spawn', target: a.target, count: n });
        break;
      }
      case 'removeEnemy': delete state.enemies[a.enemyId]; break;
      case 'editEnemy': {
        const e = state.enemies[a.enemyId];
        if (!e) break;
        for (const k of ['armor', 'damage', 'attacks', 'hp', 'maxHp']) if (a[k] != null && a[k] !== '') e[k] = Math.max(0, Number(a[k]) || 0);
        if (a.name) e.name = String(a.name).slice(0, 40);
        if (a.ability != null) e.ability = String(a.ability).slice(0, 140);
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
        if (e.hp <= 0) { delete state.enemies[e.id]; log(state, `${e.name} falls.`, 'kill'); }
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
      case 'makeLootCards': {
        const n = Math.max(1, Math.min(Number(a.count) || 1, 40));
        for (let i = 0; i < n; i++) {
          const rarity = a.rarity === 'random' || !a.rarity ? randomRarity(rng) : a.rarity;
          const it = makeItem(rarity, rng);
          do it.card = Array.from({ length: 6 }, () => 'ACDEFGHJKMNPQRTUVWXY34679'[Math.floor(rng() * 25)]).join(''); while (state.loot[it.card]);
          state.loot[it.card] = it;
        }
        break;
      }
      case 'clearLootCards': state.loot = {}; break;
      case 'claimLoot': {
        need();
        const it = state.loot[String(a.card || '').toUpperCase()];
        if (!it) throw new Error('That treasure has already been claimed');
        delete state.loot[it.card];
        delete it.card;
        ch.bag.push(it);
        ev.push({ type: 'loot', charId: ch.id, item: it });
        log(state, `${ch.name} claims ${it.name} (${RARITIES[it.rarity].label}) from a hidden cache!`, 'loot');
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
  } catch (err) {
    return { error: err.message, events: [] };
  }
  return { events: ev };
}
