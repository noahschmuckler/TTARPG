// The Rakshasa: a travelling merchant who buys unwanted gear for Favour, sells permanent boons and
// single-use consumables, and deals Three-Card Crown. Pure data and helpers; the actions live in engine.js.

// Favour paid per item, by rarity.
export const SELL_VALUE = { common: 1, magic: 2, rare: 3, set: 4, legendary: 6 };

// Permanent boons. Each repeat purchase costs +1; `once` boons can be bought one time per hero.
export const BOONS = {
  health: { name: 'Hide of the Tiger', text: '+150 max health', stats: { maxHp: 150 }, cost: 2 },
  damage: { name: 'Whetted Claws', text: '+40 damage per hit', stats: { damage: 40 }, cost: 2 },
  energy: { name: 'Deep Breath', text: '+15 max energy', stats: { maxEnergy: 15 }, cost: 2 },
  hunger: { name: 'Hunger', text: '+2 energy per kill', stats: { energyPerKill: 2 }, cost: 2 },
  pulse: { name: 'Steady Pulse', text: '+3 energy per round', stats: { energyPerRound: 3 }, cost: 3 },
  hide: { name: 'Iron Skin', text: '+3% armor', stats: { armor: 3 }, cost: 3 },
  cruelty: { name: 'Cruelty', text: '+½ crit damage', stats: { critMult: 0.5 }, cost: 5 },
  reaper: { name: "Reaper's Arc", text: '+1 cleave', stats: { cleave: 1 }, cost: 6 },
  eye: { name: "The Tiger's Eye", text: '+1 die on every attack', stats: { dice: 1 }, cost: 10, once: true },
};
export const boonPrice = (ch, key) => BOONS[key].cost + ((ch.boonBuys || {})[key] || 0);
export const boonLocked = (ch, key) => BOONS[key].once && ((ch.boonBuys || {})[key] || 0) > 0;

// Single-use consumables: bought for Favour or granted by the GM. Using one is free (not your action), one per turn.
export const CONSUMABLES = {
  draught: { name: 'Draught of Second Wind', text: 'Heal 50% of your max health.', cost: 2, effect: { kind: 'heal', pct: 50 } },
  spark: { name: "Djinn's Spark", text: 'Gain 40 energy.', cost: 2, effect: { kind: 'energy', amount: 40 } },
  mirror: { name: 'Mirror Ward', text: 'Gain a 500 ward.', cost: 2, effect: { kind: 'ward', amount: 500 } },
  smoke: { name: 'Smoke Pellet', text: 'Become Hidden at once.', cost: 1, effect: { kind: 'hide' } },
  lightning: { name: 'Bottled Lightning', text: 'Gain 3 minion-slaying hits.', cost: 2, effect: { kind: 'smite', kills: 3 } },
  knuckle: { name: 'Lucky Knucklebone', text: '+2 dice on your next attack.', cost: 1, effect: { kind: 'buff', bonusDice: 2 } },
};

// What he says. Picked at random.
export const LINES = {
  open: [
    "G'day, g'day! Step right up, mate. Everything's for sale except me dignity, and that went years ago.",
    "Oh, it's you lot. Still breathing? Good for business. What've you got for me?",
    "Rug's out, lamp's lit. Show us your junk and I'll show you a miracle.",
  ],
  close: [
    "Pleasure as always. Don't die, eh? Can't sell to corpses. Well. Not often.",
    "Shop's shut! Mind the lamp on your way out.",
    "Off you pop. I'll find you. I always find you.",
  ],
  sell: {
    common: ["Bit of rust on this one, mate. I'll be generous.", "Mmm. Firewood. Fine, fine.", "Saw a goblin wearing one of these. He was embarrassed too."],
    magic: ["Ooh, a little sparkle. Not bad, not bad.", "That'll fetch a fair price in the right market. Which isn't this one."],
    rare: ["Now we're talkin'. Lovely work, this.", "Careful, you'll make me sentimental."],
    set: ["Breaking up a set? Bold. I'll find it a good home. Probably.", "Oh, the collectors are going to fight over this."],
    legendary: ["Oh, now THAT's a beauty. You sure, mate? ... Too late, it's mine.", "Crikey. My hands are shaking. That's the greed, not the cold."],
  },
  boon: ["Hold still. This'll only hurt for a fortnight.", "There. Feel that? That's the good stuff.", "Permanent, that. No refunds, no takebacks, no crying."],
  buy: ["Single use, mind. Don't waste it on a rat.", "Lovely choice. Smells a bit, works a treat."],
  deal: ["Three cards, one redraw, and the house always — well. Usually. Let's play.", "Fancy a little flutter? Cards on the rug, mates."],
  houseWins: ["Ha! The house thanks you for your donation.", "Unlucky, mate. Have you considered being better?"],
  houseLoses: ["Oh you cheeky — fine. FINE. Take it.", "Beginner's luck. It always runs out. Always."],
};
export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];

// ---------------------------------------------------------------- Three-Card Crown
export const SUITS = ['swords', 'flames', 'crowns', 'skulls'];
export const SUIT_LABEL = { swords: 'Swords', flames: 'Flames', crowns: 'Crowns', skulls: 'Skulls', joker: 'Rakshasa' };
export function newDeck(rng = Math.random) {
  const d = [];
  for (const s of SUITS) for (let v = 1; v <= 9; v++) d.push(`${s}:${v}`);
  d.push('joker:0', 'joker:1');
  for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; }
  return d;
}
export const parseCard = c => { const [suit, v] = c.split(':'); return { suit, v: Number(v), joker: suit === 'joker' }; };

export const HAND_NAMES = ['High card', 'Pair', 'Flush', 'Run', 'Three of a kind'];
// Score a plain (no-joker) hand as [category, ...tiebreak values], higher is better.
function scorePlain(cards) {
  const vs = cards.map(c => c.v).sort((a, b) => b - a);
  const flush = cards.every(c => c.suit === cards[0].suit);
  const run = vs[0] - vs[1] === 1 && vs[1] - vs[2] === 1;
  if (vs[0] === vs[2]) return [4, vs[0]];
  if (run) return [3, vs[0]];
  if (flush) return [2, ...vs];
  if (vs[0] === vs[1] || vs[1] === vs[2]) { const p = vs[1], k = vs[0] === vs[1] ? vs[2] : vs[0]; return [1, p, k]; }
  return [0, ...vs];
}
const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
// Best score for a hand of card codes; jokers become whichever card helps most.
export function scoreHand(codes) {
  const cards = codes.map(parseCard);
  const fixed = cards.filter(c => !c.joker), nj = cards.length - fixed.length;
  if (!nj) return scorePlain(fixed);
  const all = []; for (const s of SUITS) for (let v = 1; v <= 9; v++) all.push({ suit: s, v });
  let best = null;
  const tryWith = extra => { const s = scorePlain([...fixed, ...extra]); if (!best || cmp(s, best) > 0) best = s; };
  if (nj === 1) for (const a of all) tryWith([a]);
  else if (nj === 2) for (const a of all) for (const b of all) tryWith([a, b]);
  else tryWith([{ suit: 'crowns', v: 9 }, { suit: 'crowns', v: 9 }, { suit: 'crowns', v: 9 }]);
  return best;
}
export const handName = score => HAND_NAMES[score[0]];
export const compareHands = cmp;

// The house keeps anything better than high card, otherwise redraws its two lowest cards.
export function houseSwaps(codes) {
  const s = scoreHand(codes);
  if (s[0] > 0) return [];
  const idx = codes.map((c, i) => [parseCard(c), i]).filter(([c]) => !c.joker).sort((a, b) => a[0].v - b[0].v).map(([, i]) => i);
  return idx.slice(0, 2);
}
