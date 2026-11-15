// Adventures: acts made of scenes, with foes sized by a pressure curve.
//
// Difficulty follows the Diablo rhythm: within an act each scene is a little harder than the last, up to the
// act's boss; the act's loot then lifts the party, and the next act starts easier again against that stronger
// party. Foes are sized from a snapshot of the party taken when the act begins ("the act anchor"), so gear
// found mid-act makes the rest of the act feel easier, and the boss hoard is the big jump.
// Pure data and maths; the actions live in engine.js.

export const TEMPLATES = {
  skirmish: { label: 'Skirmish', text: 'A light fight: a couple of waves of minions.', minionRounds: 2.5, elites: 0, bosses: 0, waves: 2 },
  swarm: { label: 'Swarm', text: 'Wave after wave of minions.', minionRounds: 4, elites: 0, bosses: 0, waves: 3 },
  elitepack: { label: 'Elite pack', text: 'Two elites with a screen of minions.', minionRounds: 1.5, elites: 2, bosses: 0, waves: 2 },
  gauntlet: { label: 'Gauntlet', text: 'An elite and three waves of minions.', minionRounds: 3, elites: 1, bosses: 0, waves: 3 },
  boss: { label: 'Boss', text: 'The act\'s boss and its adds.', minionRounds: 1.5, elites: 0, bosses: 1, waves: 2 },
  story: { label: 'Story', text: 'No fight: narration, a rest or a chest.', minionRounds: 0, elites: 0, bosses: 0, waves: 1 },
};

// shift moves the whole pressure curve; loot moves the rarity of planned loot (Brutal pays better).
export const DIFFICULTY = {
  casual: { label: 'Casual', shift: -0.15, loot: -1 },
  normal: { label: 'Normal', shift: 0, loot: 0 },
  brutal: { label: 'Brutal', shift: 0.2, loot: 1 },
};

// Tuning
export const ELITE_ROUNDS = 2;        // an elite lasts about this many rounds of party damage at pressure 1
export const BOSS_ROUNDS = 4;
export const THREAT_SHARE = 0.10;     // at pressure 1 the foes threaten this share of the party's health each enemy phase
const LAND = 0.5;                     // rough chance a foe's blow lands
const MINION_DAMAGE = 60;

// Pressure for scene `s` of `n` in act `a` (0-based): climbs through the act, and each act starts and peaks a bit higher.
export function curvePressure(a, s, n) {
  const lo = Math.min(0.6 + 0.08 * a, 0.9), hi = Math.min(1.3 + 0.1 * a, 1.7);
  return n <= 1 ? hi : lo + (hi - lo) * s / (n - 1);
}

export function scenePressure(adv, a, s) {
  const act = adv.acts[a], sc = act.scenes[s];
  const base = sc.pressure != null && sc.pressure !== '' ? Number(sc.pressure) : curvePressure(a, s, act.scenes.length);
  return Math.max(0.3, Math.round((base + (DIFFICULTY[adv.difficulty] || DIFFICULTY.normal).shift) * 100) / 100);
}

// The party's strength, from the same numbers the engine uses: damage per round, total health,
// and how many minions they cut down in a round (half their dice hit; sixes add cleave).
export function partyPower(state, derive, partyDamagePerRound) {
  const heroes = state.order.map(id => state.characters[id]).filter(Boolean);
  let hp = 0, kills = 0;
  for (const ch of heroes) { const s = derive(ch); hp += s.maxHp; kills += s.dice * 0.5 + s.dice / 6 * (s.cleave || 0); }
  return { dpr: partyDamagePerRound(state, 0), hp, kills: Math.round(kills * 10) / 10, heroes: heroes.length, round: state.round };
}

const r10 = x => Math.round(x / 10) * 10;
const r500 = x => Math.round(x / 500) * 500;
export const flatIndex = (adv, a, s) => adv.acts.slice(0, a).reduce((t, act) => t + act.scenes.length, 0) + s;

// Everything a scene puts on the board, wave by wave. anchor = partyPower snapshot for the act.
export function planScene(adv, a, s, anchor) {
  const sc = adv.acts[a].scenes[s];
  const T = TEMPLATES[sc.template] || TEMPLATES.skirmish;
  const p = scenePressure(adv, a, s);
  const named = (list, n, fallback) => {
    const out = [];
    for (const f of list || []) for (let i = 0; i < Math.max(1, f.count || 1); i++) out.push({ ...f });
    while (out.length < n) out.push({ name: fallback, abilities: [], ability: '' });
    return out;
  };
  const elites = named(sc.elites, T.elites, 'Elite');
  const bosses = named(sc.bosses, T.bosses, 'Boss');
  const minionTotal = Math.round((anchor.kills || 4) * T.minionRounds * p);
  const waves = Math.max(1, T.waves);
  const first = waves === 1 ? minionTotal : Math.ceil(minionTotal / 2);
  // damage: share out the threat target between the first wave's minions and the big foes
  const target = THREAT_SHARE * (anchor.hp || 4000) * p;
  const minionThreat = first * MINION_DAMAGE * LAND;
  const weight = elites.reduce((t, e) => t + (e.size || 1), 0) + bosses.reduce((t, b) => t + 2.5 * (b.size || 1), 0);
  const per = weight ? Math.max(target - minionThreat, target * 0.4) / weight : 0;
  const big = (f, type) => {
    const boss = type === 'boss', size = f.size || 1;
    const attacks = f.attacks || (boss ? 3 : 2);
    const damage = Math.min(boss ? 3000 : 2000, Math.max(boss ? 300 : 150, r10(per * (boss ? 2.5 : 1) * size / (attacks * LAND))));
    const armor = f.armor ?? (boss ? 35 : 20);
    // armor cuts every hit, so size health against the damage that actually gets through
    const hp = Math.max(boss ? 4000 : 1000, r500((anchor.dpr || 3000) * (1 - armor / 100) * (boss ? BOSS_ROUNDS : ELITE_ROUNDS) * p * size));
    return { type: 'spawn', etype: type, count: 1, name: f.name, hp, armor, attacks, damage, abilities: f.abilities || [], ability: f.ability || '' };
  };
  const minionNames = (sc.minions && sc.minions.length) ? sc.minions : ['Minion'];
  const minionSpawns = n => {
    const by = {};
    for (let i = 0; i < n; i++) { const nm = minionNames[i % minionNames.length]; by[nm] = (by[nm] || 0) + 1; }
    return Object.entries(by).map(([name, count]) => ({ type: 'spawn', etype: 'minion', count, name }));
  };
  const rest = minionTotal - first, later = waves - 1;
  const out = [{ at: 0, spawns: [...bosses.map(b => big(b, 'boss')), ...elites.map(e => big(e, 'elite')), ...minionSpawns(first)] }];
  for (let w = 1; w <= later; w++) {
    const n = Math.floor(rest / later) + (w <= rest % later ? 1 : 0);
    if (n > 0) out.push({ at: w, spawns: minionSpawns(n) });
  }
  return { pressure: p, template: T.label, minions: minionTotal, waves: out.filter(w => w.spawns.length) };
}

// Foes a narration beat brings in mid-scene, sized like the scene's own (same act anchor and pressure).
export function planBeat(adv, a, s, anchor, beat, heroes) {
  const out = [];
  if (beat.elites?.length) {
    // size them alongside the scene's own big foes, so they share the threat instead of taking all of it
    const sc = adv.acts[a].scenes[s];
    const tmp = { ...adv, acts: adv.acts.map((act, ai) => ai !== a ? act : { ...act, scenes: act.scenes.map((x, si) => si !== s ? x : { ...x, template: 'story', elites: [...(sc.elites || []), ...beat.elites], bosses: sc.bosses || [], minions: [] }) }) };
    const all = planScene(tmp, a, s, anchor).waves[0]?.spawns || [];
    out.push(...all.filter(x => x.etype === 'elite').slice(-beat.elites.reduce((t, f) => t + Math.max(1, f.count || 1), 0)));
  }
  if (beat.minions) out.push({ type: 'spawn', etype: 'minion', count: beat.minions.perHero * Math.max(1, heroes), name: beat.minions.name });
  return out;
}

// Readable one-line summary of a planned wave.
export const waveText = w => w.spawns.map(x => `${x.count > 1 ? x.count + ' ' : ''}${x.name}${x.etype !== 'minion' ? '' : x.count > 1 ? 's' : ''}`).join(', ');

// ------------------------------------------------------------ cleaning what the editor sends
const str = (v, n) => String(v ?? '').slice(0, n);
function cleanFoe(f, abilityKeys) {
  return {
    name: str(f.name || 'Foe', 40), count: Math.max(1, Math.min(Number(f.count) || 1, 8)), size: Math.max(0.2, Math.min(Number(f.size) || 1, 4)),
    abilities: (f.abilities || []).filter(k => abilityKeys.includes(k)), ability: str(f.ability, 140),
    ...(f.attacks ? { attacks: Math.max(1, Math.min(Number(f.attacks), 6)) } : {}), ...(f.armor != null && f.armor !== '' ? { armor: Math.max(0, Math.min(Number(f.armor) || 0, 90)) } : {}),
  };
}
export function cleanAdventure(a, abilityKeys) {
  const acts = (a.acts || []).slice(0, 8).map((act, ai) => ({
    name: str(act.name || `Act ${ai + 1}`, 40),
    scenes: (act.scenes || []).slice(0, 10).map((sc, si) => ({
      name: str(sc.name || `Scene ${si + 1}`, 40),
      template: TEMPLATES[sc.template] ? sc.template : 'skirmish',
      ...(sc.pressure != null && sc.pressure !== '' ? { pressure: Math.max(0.3, Math.min(Number(sc.pressure) || 1, 3)) } : {}),
      chests: Math.max(0, Math.min(Number(sc.chests) || 0, 12)),
      minions: (sc.minions || []).map(m => str(m, 30)).filter(Boolean).slice(0, 6),
      elites: (sc.elites || []).slice(0, 6).map(f => cleanFoe(f, abilityKeys)),
      bosses: (sc.bosses || []).slice(0, 3).map(f => cleanFoe(f, abilityKeys)),
      intro: str(sc.intro, 1500), outro: str(sc.outro, 1500), notes: str(sc.notes, 400),
      beats: (sc.beats || []).slice(0, 8).map(b => ({ label: str(b.label || 'Beat', 30), text: str(b.text, 1500),
        ...(b.elites?.length ? { elites: b.elites.slice(0, 6).map(f => cleanFoe(f, abilityKeys)) } : {}),
        ...(b.minions?.name ? { minions: { name: str(b.minions.name, 30), perHero: Math.max(1, Math.min(Number(b.minions.perHero) || 1, 4)) } } : {}),
        ...(b.repeat ? { repeat: true } : {}) })).filter(b => b.text || b.elites || b.minions),
    })),
  })).filter(act => act.scenes.length);
  if (!acts.length) throw new Error('Add at least one act with a scene');
  return { name: str(a.name || 'Adventure', 60), difficulty: DIFFICULTY[a.difficulty] ? a.difficulty : 'normal', acts };
}

// Text form used by the editor for elites and bosses, one per line:
//   Name x2 @0.5: enrage, regen | what it does
// "x2" = how many, "@0.5" = size (health and damage), then abilities, then the note shown on phones.
export function parseFoes(text, abilities) {
  const byName = {};
  for (const [k, A] of Object.entries(abilities)) { byName[k.toLowerCase()] = k; byName[A.name.toLowerCase()] = k; }
  return String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(line => {
    const bar = line.indexOf('|');
    const head = bar < 0 ? line : line.slice(0, bar), ability = bar < 0 ? '' : line.slice(bar + 1).trim();
    const colon = head.indexOf(':');
    let name = (colon < 0 ? head : head.slice(0, colon)).trim();
    const abil = colon < 0 ? '' : head.slice(colon + 1);
    let count = 1, size = 1;
    name = name.replace(/\s+[x×](\d+)\b/i, (_, n) => { count = Number(n); return ''; });
    name = name.replace(/\s+@\s*([\d.]+)/, (_, n) => { size = Number(n); return ''; }).trim();
    const keys = abil.split(',').map(x => byName[x.trim().toLowerCase()]).filter(Boolean);
    return { name: name || 'Foe', count, size, abilities: keys, ability };
  });
}
export function formatFoes(list) {
  return (list || []).map(f => `${f.name}${f.count > 1 ? ` x${f.count}` : ''}${f.size && f.size !== 1 ? ` @${f.size}` : ''}${f.abilities?.length ? ': ' + f.abilities.join(', ') : ''}${f.ability ? ' | ' + f.ability : ''}`).join('\n');
}

// Narration beats, one per line:  Label | text   (sent from Headquarters while the scene runs)
export const parseBeats = text => String(text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => {
  const bar = l.indexOf('|');
  return bar < 0 ? { label: l.slice(0, 24), text: l } : { label: l.slice(0, bar).trim(), text: l.slice(bar + 1).trim() };
});
export const formatBeats = list => (list || []).map(b => `${b.label} | ${b.text}`).join('\n');

// ------------------------------------------------------------ the campaign we've been playing
const F = (name, abilities = [], ability = '', extra = {}) => ({ name, abilities, ability, ...extra });
export const EIGHTH_GATE = {
  name: 'The Eighth Gate', difficulty: 'normal',
  acts: [
    { name: 'Act I · The Meadow', scenes: [
      { name: 'The Meadow', template: 'skirmish', chests: 1, minions: ['Twig Blight'] },
      { name: 'The Ruins', template: 'gauntlet', chests: 1, minions: ['Needle Blight'], elites: [F('Dire Troll', ['regen', 'enrage'], 'Regenerates among the ruins')] },
      { name: 'The Grove', template: 'swarm', chests: 1, minions: ['Vine Blight'], notes: 'Old Barkhide\'s trial: keep the vine blights off the ent.' },
      { name: 'The Bodytaker', template: 'boss', chests: 1, minions: ['Thorn Blight'], bosses: [F('The Bodytaker', ['summoner', 'horde', 'stoneskin'], 'Kill it and the thorn wall withers')] },
    ] },
    { name: 'Act II · The Caverns', scenes: [
      { name: 'The Tunnel', template: 'skirmish', chests: 1, minions: ['Giant Rat'] },
      { name: 'The Gap', template: 'skirmish', chests: 0, minions: ['Skeleton'] },
      { name: 'The Warren', template: 'elitepack', chests: 1, minions: ['Zombie'], elites: [F('Archmage', ['summoner'], 'Raises the dead every round. Kill him first.'), F('Loup Garou', ['enrage', 'thickhide'], 'Released from the beast pit')] },
      { name: 'The Gnawhole', template: 'gauntlet', chests: 1, minions: ['Spider'], elites: [F('Rakshasa', ['leech', 'thickhide'], 'Will offer a deal before it dies')] },
      { name: 'The Zombie Clot', template: 'boss', chests: 1, minions: ['Zombie'], bosses: [F('Zombie Clot', ['regen', 'horde', 'throes', 'slam'], 'Its arms are balls of bodies: a landed blow slams you 3″, maybe into the chasm. The spore mushrooms feed it: pop all three to stop its healing.')],
        notes: '3 spore mushrooms (block sight): a hero spends their whole attack on one, 2+ hits pops it. All three popped: untick Regenerate on the Clot. Spores 3 sits south of the palisade and can be popped early. Send "The Clot feeds" at the first End round; untick Regenerate with "Last mushroom".',
        intro: "The tunnel opens into a cavern that stinks of wet earth and old meat. Three great mushrooms stand around it like pillars, their caps pulsing slowly, and from their gills drifts a thin, glittering haze of spores. The haze isn't drifting at random. All of it flows toward the middle of the cave, where something the size of a cart is breathing. It's made of bodies: dozens of them, pressed and knotted together, grey limbs and slack faces shifting as it moves, all held together by a fine white web that glistens wherever the spores settle. The Zombie Clot turns toward your light, and every face in it opens its mouth at once.",
        outro: "The Clot sags, bulges and bursts. A wave of rot and bone blasts across the cavern and slaps into every one of you. When it settles there's no Clot, only a wide grey heap of what used to be people, and white threads dissolving into nothing. Beyond the heap, the cave mouth opens onto cold air and grey light: the foot of the mountain path, and above it, faint and far, the peak.",
        beats: [{"label": "The Clot feeds", "text": "More zombies shamble in through the north gate, slack-jawed and swaying. A surge of spores rolls off the mushrooms in a glittering wave and breaks over the Clot. Its white threads lash out like fishing lines, hook the two nearest zombies and reel them in. They fold into its mass with a wet crunch, and the wounds you've cut into it knit closed over them. The Clot is bigger than it was. As long as those mushrooms keep breathing, it'll keep doing that."}, {"label": "Mushroom 1 pops", "text": "The mushroom splits with a sound like a wet drum and collapses in a puff of dead grey dust. The haze over the Clot thins, and one strand of its white webbing goes slack. The Clot shudders, as if it felt that."}, {"label": "Mushroom 2 pops", "text": "A second mushroom bursts. The spore stream is a trickle now. Where the Clot's wounds were knitting, they stop, and weep instead."}, {"label": "Last mushroom", "text": "The last mushroom ruptures and the glittering haze simply stops. The Clot's white threads blacken and curl like burnt hair. Bodies at its edges begin to slump away from it, and its wounds stay open. It can't heal any more, and it knows it. It screams with every mouth it has."}, {"label": "The Horde", "text": "The Clot convulses and splits along a seam. Zombies tumble out of it by the armful, half-formed and furious, and throw themselves at you."}] },
    ] },
    { name: 'Act III · The Peak', scenes: [
      { name: 'The Last Campfire', template: 'story', chests: 0,
        notes: 'Full heal: tap Full on each hero card. Open the Rakshasa\'s stall if you like. Then begin The Seals.',
        intro: "The tunnel ends in a blast of white. You climb out onto the mountain's shoulder, where the wind screams over a field of blue ice, and someone has left a fire burning in a ring of black stones. Above you the ice rises in terraces toward a great gate of carved green stone set into the peak. Three glowing seals hold it shut. Below the seals, the ice is cracked, and red light seeps from the cracks like blood under skin. For now, nothing moves. Warm your hands. It won't last." },
      { name: 'The Seals', template: 'elitepack', chests: 1, minions: ['Frozen Dead'],
        elites: [F('Green Slaad', ['sweep'], 'Holds Seal I'), F('Skelespider', ['leech'], 'Holds Seal II'), F('Relentless Killer', ['enrage', 'stoneskin'], 'Holds Seal III')],
        notes: 'While any seal holds: tap "The dead leak" at every End round (1 Frozen Dead per hero). Send a seal beat as each guard falls. When all three fall: Scene clear, then full heal before the gate.',
        intro: "The seals blaze as you step onto the field. Three guardians turn to face you: a hulking green slaad croaking at Seal I, a skeletal spider unfolding beside Seal II, and at Seal III a still, patient figure that has never once in its long life stopped walking toward its prey. Under your boots, the red cracks split wider, and something cold and grey begins to climb out.",
        beats: [
          { label: 'The dead leak', repeat: true, minions: { name: 'Frozen Dead', perHero: 1 }, text: "The red cracks pulse, and the frozen dead claw their way up through the ice, one for each of you." },
          { label: 'Seal I breaks', text: "Seal I shatters with a sound like a bell cracking. High on the gate, a carved stone eyelid lifts, just a sliver. Something behind it is watching now." },
          { label: 'Seal II breaks', text: "Seal II goes out like a snuffed candle. The stone eye on the gate opens wider, and the cracks under your feet stop bleeding red and start to glow a cold, sick green." },
          { label: 'Seal III breaks', text: "The last seal dies. The eye on the gate opens fully, and the whole mountain shudders. The gate grinds apart, and beyond it lies a vast sheet of black ice pocked with round holes, like a frozen lake that has been breathing. The cracks stop leaking. In the sudden silence, you have a moment. Take it." },
        ] },
      { name: 'The Tentacles', template: 'elitepack', chests: 0, minions: ['Frozen Dead'],
        elites: [F('Tentacle', ['leech'], 'Reach: a 7″ × 4″ L. End your move in it and it is laid on you: grabbed (Break Away to leave).', { count: 3, size: 0.5, attacks: 1 })],
        notes: 'The Kraken sits submerged in the Coil: it cannot be targeted yet. Grab rule: a hero who ends their move in a tentacle\'s reach gets it laid on them (set it engaged with them). When the last tentacle falls: Scene clear, then begin The Kraken.',
        intro: "You step through the gate onto the black ice. Under it, in the middle of the lake, something enormous turns over in its sleep, and the ice in the Coil bulges upward. Then the holes erupt. Three tentacles as thick as tree trunks burst into the air, coiling and searching, and slap down onto the ice around you." },
      { name: 'The Kraken', template: 'boss', chests: 1, minions: ['Frozen Dead'],
        bosses: [F('The Kraken', ['sweep', 'enrage', 'horde', 'throes'], 'On a 5-6 at End round it dives and rises in another circle. At half health, 2 tentacles regrow.')],
        notes: 'Dive: each End round roll a d6. On 5-6 it sinks and rises in another circle: move the base and set it roaming (⇄), ending every engagement. At half health tap "Tentacles regrow" (2 tentacles, sized to the fight).',
        intro: "The last tentacle falls, and for a heartbeat there is nothing. Then the ice in the Coil explodes upward and the Kraken rises: a mountain of grey-green flesh, a beak like a ship's prow, and one huge eye that finds each of you in turn. It is the thing the seals were keeping in. It is the thing the dead were serving. And it is very, very awake.",
        beats: [
          { label: 'It dives', repeat: true, text: "The Kraken sinks straight down through the ice as if it were water. The lake goes still... and then another circle bursts open as it rises somewhere else." },
          { label: 'Tentacles regrow', elites: [F('Tentacle', ['leech'], 'Reach: a 7″ × 4″ L. End your move in it and it is laid on you: grabbed.', { count: 2, size: 0.5, attacks: 1 })], text: "Black ichor pours from the Kraken's wounds and freezes into new limbs. Two fresh tentacles tear up through the holes beside it, still steaming." },
        ],
        outro: 'The Kraken\'s last tentacle goes slack, and the great carved eye in the gate slowly closes. Behind the gate a staircase of dark polished wood winds downward, and from far below comes the scratch of a thousand pens. At the top of the stair, on a crate he definitely did not have a minute ago, sits the Rakshasa, holding a contract tied with red ribbon. "Lovely work, that. Now. Who here can read fine print?"' },
    ] },
    { name: 'Act IV · The Ledger Hall', scenes: [
      { name: 'The Clerks\' Floor', template: 'swarm', chests: 1, minions: ['Ghost Clerk'],
        intro: 'Past the counter, every clerk looks up at once. "Unregistered," they whisper. "Unpaid." They rise from their desks to collect.' },
      { name: 'Doom hall: the Archive', template: 'elitepack', chests: 1, minions: ['Debtor Ghost'], elites: [F('Doom Shelf', [], 'Grinds 2 squares down the hall each End round; crushes what it can\'t push (400).', { size: 0.5, attacks: 1 }), F('The Defaulted', ['summoner', 'regen'], 'Carries Folio III')] },
      { name: 'Doom hall: the Collector', template: 'elitepack', chests: 1, minions: ['Debtor Ghost'], elites: [F('Doom Shelf', [], 'Grinds 2 squares down the hall each End round; crushes what it can\'t push (400).', { size: 0.5, attacks: 1 }), F('The Collector', ['enrage', 'throes'], 'Interest compounds. Carries Folio II and the strongroom key.')] },
      { name: 'Doom hall: the Auditor', template: 'elitepack', chests: 1, minions: ['Debtor Ghost'], elites: [F('Doom Shelf', [], 'Grinds 2 squares down the hall each End round; crushes what it can\'t push (400).', { size: 0.5, attacks: 1 }), F('The Auditor', ['leech', 'sweep'], 'Sees everything: Hidden doesn\'t work in its sight. Carries Folio I.')] },
      { name: 'Old Surety', template: 'boss', chests: 2, minions: ['Ghost Clerk'], bosses: [F('Old Surety', [], 'Every unpaid debt, guaranteed. Knock down his orbiting books to strip their powers.')],
        notes: 'Run gm-tools/surety.cjs to add his orbiting colour stones.' },
    ] },
  ],
};
