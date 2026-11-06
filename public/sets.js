// Item sets and hidden synergies. Pure data — tune freely.
//
// Each set has four pieces. ONE equipped piece unlocks the set's power; every
// extra piece strengthens that power (power(n) gets the equipped count) and
// may add stat bonuses (bonuses[] with n = pieces needed).
//
// Synergies need pieces from two different sets. They stay hidden until a hero
// first equips the combination. They add stats and/or strengthen set powers:
//   mods: { '<set power key>': { cost: -10, add: [effects merged into the power] } }
//
// Effect kinds (shared with class powers):
//   smite    { kills }                    minion-only hits added to your pool
//   buff     { bonusDice, damageMult }    applies to your next attack roll
//   ward     { amount, who: self|party }  soaks incoming damage
//   heal     { pct, who: self|party }     % of max health
//   energize { amount, who: others|party }

export const SETS = {
  thunderforge: {
    name: 'Thunderforge', color: '#7fb0ff', lore: 'Arms of the storm-smiths of Kazrun.',
    pieces: { weapon: 'Thunderforge Maul', helm: 'Thunderforge Crown', gloves: 'Thunderforge Gauntlets', armor: 'Thunderforge Plate' },
    bonuses: [{ n: 2, stats: { maxHp: 250 } }, { n: 4, stats: { dice: 1 } }],
    power: {
      key: 'set:thunderforge', name: 'Thunderclap', cost: 40,
      effects: n => [{ kind: 'smite', kills: 2 + n }, ...(n >= 3 ? [{ kind: 'ward', amount: n >= 4 ? 400 : 200, who: 'self' }] : [])],
    },
  },
  emberheart: {
    name: 'Emberheart', color: '#ff7a59', lore: 'Regalia of the ember-sages who kept the deep forges lit.',
    pieces: { weapon: 'Emberheart Rod', amulet: 'Emberheart Locket', ring: 'Emberheart Signet', gloves: 'Emberheart Wraps' },
    bonuses: [{ n: 2, stats: { damage: 150 } }, { n: 3, stats: { critMult: 0.5 } }],
    power: {
      key: 'set:emberheart', name: 'Emberburst', cost: 35,
      effects: n => [{ kind: 'buff', damageMult: [0, 1.5, 1.75, 2, 2.5][n], ...(n >= 3 ? { bonusDice: 1 } : {}) }],
    },
  },
  stonewarden: {
    name: 'Stonewarden', color: '#b9c2a3', lore: 'Worn by the wardens who hold the Eighth Gate.',
    pieces: { armor: 'Stonewarden Cuirass', helm: 'Stonewarden Visor', boots: 'Stonewarden Greaves', amulet: 'Stonewarden Torc' },
    bonuses: [{ n: 2, stats: { armor: 6 } }, { n: 4, stats: { maxHp: 500 } }],
    power: {
      key: 'set:stonewarden', name: 'Stonewall', cost: 45,
      effects: n => [{ kind: 'ward', amount: 80 + 120 * n, who: 'party' }, ...(n >= 4 ? [{ kind: 'heal', pct: 10, who: 'party' }] : [])],
    },
  },
  deepdelver: {
    name: 'Deepdelver', color: '#e8c35a', lore: 'Kit of the lantern-scouts who map the endless dark.',
    pieces: { weapon: 'Deepdelver Arbalest', boots: 'Deepdelver Treads', helm: 'Deepdelver Lamp-Helm', ring: 'Deepdelver Band' },
    bonuses: [{ n: 2, stats: { energyPerKill: 2 } }, { n: 3, stats: { cleave: 1 } }, { n: 4, stats: { dice: 1 } }],
    power: {
      key: 'set:deepdelver', name: 'Lantern Volley', cost: 30,
      effects: n => [{ kind: 'buff', bonusDice: 1 + n }],
    },
  },
  runekeeper: {
    name: 'Runekeeper', color: '#5fd3c4', lore: 'Vestments of the keepers of the Great Ledger.',
    pieces: { amulet: 'Runekeeper Chain', ring: 'Runekeeper Seal', armor: 'Runekeeper Vestments', gloves: 'Runekeeper Inkhands' },
    bonuses: [{ n: 2, stats: { energyPerRound: 6 } }, { n: 3, stats: { maxEnergy: 25 } }],
    power: {
      key: 'set:runekeeper', name: 'Runic Surge', cost: 40,
      effects: n => [{ kind: 'energize', amount: 10 + 5 * n, who: 'others' }, ...(n >= 2 ? [{ kind: 'heal', pct: n >= 4 ? 20 : 10, who: 'party' }] : [])],
    },
  },
  vaultbreaker: {
    name: 'Vaultbreaker', color: '#c58cff', lore: 'Tools of the thieves who robbed the Last Vault — twice.',
    pieces: { weapon: 'Vaultbreaker Dirks', gloves: 'Vaultbreaker Picks', boots: 'Vaultbreaker Soft-Soles', ring: 'Vaultbreaker Key-Ring' },
    bonuses: [{ n: 2, stats: { critMult: 0.5 } }, { n: 3, stats: { energyPerKill: 3 } }],
    power: {
      key: 'set:vaultbreaker', name: 'Shadowstep', cost: 30,
      effects: n => [{ kind: 'ward', amount: 100 + 150 * n, who: 'self' }, ...(n >= 2 ? [{ kind: 'buff', damageMult: n >= 4 ? 2 : 1.5 }] : [])],
    },
  },
};

// Which sets the planner favours for each calling (first = strongest pull).
export const CLASS_SETS = {
  ironclad: ['thunderforge', 'stonewarden'],
  runepriest: ['runekeeper', 'stonewarden'],
  ranger: ['deepdelver', 'vaultbreaker'],
  arcanist: ['emberheart', 'runekeeper'],
  shadowblade: ['vaultbreaker', 'deepdelver'],
};

export const SYNERGIES = [
  { key: 'forgeflame', name: 'Forge and Flame', needs: { thunderforge: 1, emberheart: 1 }, stats: { damage: 120 },
    mods: { 'set:thunderforge': { add: [{ kind: 'smite', kills: 2 }] }, 'set:emberheart': { cost: -10 } } },
  { key: 'thunderstone', name: 'Thunder Under Stone', needs: { thunderforge: 2, stonewarden: 1 }, stats: { armor: 8 },
    mods: { 'set:thunderforge': { add: [{ kind: 'ward', amount: 300, who: 'self' }] } } },
  { key: 'bedrock', name: 'Bedrock Litany', needs: { stonewarden: 2, runekeeper: 1 }, stats: { energyPerRound: 4 },
    mods: { 'set:stonewarden': { add: [{ kind: 'heal', pct: 10, who: 'party' }] } } },
  { key: 'deepshadow', name: 'Shadow in the Deep', needs: { vaultbreaker: 1, deepdelver: 1 }, stats: { cleave: 1 },
    mods: { 'set:deepdelver': { add: [{ kind: 'buff', bonusDice: 1 }] } } },
  { key: 'emberlantern', name: 'Ember Lantern', needs: { emberheart: 2, deepdelver: 2 }, stats: { critMult: 0.5 },
    mods: { 'set:deepdelver': { add: [{ kind: 'buff', damageMult: 0.5 }] } } },
  { key: 'runethief', name: "Rune-Thief's Bargain", needs: { runekeeper: 1, vaultbreaker: 2 }, stats: { energyPerKill: 3 },
    mods: { 'set:vaultbreaker': { cost: -10 } } },
  { key: 'stormrune', name: 'Storm-Rune', needs: { thunderforge: 1, runekeeper: 2 }, stats: { maxEnergy: 20 },
    mods: { 'set:runekeeper': { add: [{ kind: 'energize', amount: 10, who: 'others' }] } } },
  { key: 'wardenflame', name: "Warden's Ember", needs: { stonewarden: 1, emberheart: 2 }, stats: { maxHp: 200 },
    mods: { 'set:emberheart': { add: [{ kind: 'ward', amount: 250, who: 'self' }] } } },
];
