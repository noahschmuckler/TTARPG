# Campaign notes: room JBCX

## Party (4 heroes, the GM plays Gonk)
- **Gonk Strongeye**: Ironclad, the armoured knight mini.
- **Lyle Greenbottle**: Ranger, the crossbow mini.
- **Steve Rockbeard**: Runepriest, the dwarf with the frying pan and tankard.
- **Saile Regnirbmrots** (Mark's hero): Arcanist, the halfling with the wand, flipping the bird.
- Elite and boss kills so far: Saile the Bodytaker, Gonk the Archmage, Lyle the Loup Garou; the troll's killing blow is unknown.

## Where we stopped (end of session 1)
- Round 19. The gnawhole is done: the Rakshasa took the deal and vanished, and his crate went to the party.
- **Next up:** the Zombie Clot at the cave exit, with 3 spore mushrooms. Send `spores gone` once all three are popped.
- Backup: `gm-tools/backups/JBCX-2026-11-08-after-gnawhole.json`. The same snapshot is in Cloudflare KV, namespace `delvers-ledger-backups`, key `JBCX/2026-11-08-after-gnawhole`.

## Session 2 plan (about 4 hours)
1. Recap, then **the Rakshasa's stall**: the gear sale, the first boons, a round of Three-Card Crown (20–30 min).
2. **The Zombie Clot** (60–75 min).
3. The climb, and the **last campfire**: a heal, and a second stall visit if the energy is good (15 min).
4. **The seals**: Slaad, Skelespider, Relentless Killer, with the dead leaking up through the ice (60–75 min).
5. **The Kraken** (60 min): tentacles, then the body, diving between the Eye, Maw and Coil circles.
6. **The cliffhanger**: the gate's eye closes, a stair opens downward, and the Rakshasa waits with a contract.
   - Leave the plank floor and one book stack visible past the gate all session.
- Cut the stall visits or the cards if time runs short.

## Next act: the Ledger Hall (the Counting House of the Eighth Gate)
Threads it ties together: the app's name (Delvers' Ledger), the Runekeeper set ("keepers of the Great Ledger"), the Stonewarden set and Gonk's bracers ("the Eighth Gate"), and the Rakshasa's line "something up there doesn't pay its debts".

- **Premise:** the cthulhu gate is the Eighth Gate. The Kraken was a debt that came due. The Rakshasa is really a debt collector.
- **The contract:** he wants the Kraken's entry in the Great Ledger struck out.
- **The final twist:** the Ledger holds two unpaid entries, the Kraken's and the Rakshasa's own. The party chooses which to strike.
  - **Strike his:** he becomes an ally, with half-price boons.
  - **Strike the Kraken's:** he never forgives them for seeing his page.
- **Setting:** a medieval counting house on the 24×36 plank floor, with a Backrooms feel.
  - **The room shifts:** each End round, roll a die. On a 1–2, move one shelf or desk, or swap two doors.
  - **Ghost clerks** are harmless while their books balance. Fighting near a desk wakes them.
- **Layout:** see `gm-tools/ledger-hall-layout.png`. The entrance (the Eighth Gate, up from the Kraken) is at the bottom; the exit (the Final Door, three folio locks) is at the top.

  | Zone | Rows / position |
  |---|---|
  | Entry hall: waiting benches, take-a-number, the Rakshasa's stall | 32–36 |
  | Front Counter: bell, contract, counter flap (safe zone) | 31 |
  | Clerks' Floor: 18 desks, ghost clerks; the way into the Stacks at row 22 | 22–30 |
  | Auditor's Office (cols 1–4) / Collections Window (cols 20–24) | 7–21 |
  | Filing Stacks: the rotating-tile maze (cols 5–19) | 7–21 |
  | Archive of Bad Debts (cols 1–8) / dais (cols 9–16) / Strongroom (cols 17–24) | 1–6 |

- **Minions:** ghost clerks, about 35–40. They all rise once the party passes the counter flap. "Overdue": a clerk that dies comes back once, unless it's finished off before the next End round.
- **Elites:** each carries one of the three folios that open the Final Door.

  | Elite | Presets | Notes |
  |---|---|---|
  | The Auditor (Belashyrra) | Energy Leech + Sweeping Blows | Hidden doesn't work within sight of it. Folio I |
  | The Collector (daemonette) | Enrage + Death Throes | "Interest compounds". Folio II and the strongroom key |
  | The Defaulted (corpse flower) | Summoner + Regenerate | Folio III |

- **The boss: Old Surety**, the guarantor of every unpaid debt (the user's sad grey gnome/troll mini, giant at game scale, 4×4 base).
- **The book stacks as ioun stones:**
  - The 5 coloured shelves block the hub's exits and become the doom shelves (see the Filing Stacks section below).
  - Every colour not destroyed flies to Old Surety and orbits him, granting its ability:

  | Stack | Ability |
  |---|---|
  | Red: Arrears | Enrage |
  | Blue: Compound Interest | Regenerate |
  | Green: Liabilities | Summoner |
  | Black: Bad Debt | Death Throes |
  | Gold: Assets | Thick Hide |

## Running the Ledger Hall (a full session, about 4 hours)
Presets are in `scenes.json`; run them with `node gm-tools/gm.cjs JBCX '@name'`.
1. End of session 2: `@eye closes` (the cliffhanger).
2. Session 3 opens: `@counting house`, then `@contract` at the Front Counter. Open the Rakshasa's stall.
3. Clerks' Floor: `@clerks` whenever a fight comes within 2 of a desk. `@overdue` brings back clerks that weren't finished off.
4. The offices, in any order: `@auditor`, `@collector`, `@defaulted`.
5. The Filing Stacks: `@the stacks`, `@the hub`, then `@doom <colour>` for each run, with `@debtors` every End round. After the third folio, run `node gm-tools/surety.cjs JBCX bell <destroyed colours>`.
6. The dais:
   - Move each orbiting stone one square clockwise every End round.
   - When a stone falls, run `node gm-tools/surety.cjs JBCX sync`.
   - When Old Surety drops, run `@surety falls`, then `@the ledger`.
7. The choice: `@strike rakshasa` or `@strike kraken`.

## Still to prepare
- The "half-price boons" reward for striking the Rakshasa's debt isn't built in the app yet. Build it only if the party picks that ending.

## The Filing Stacks (rotating tiles; see `ledger-stacks-maze.png`)
- **The maze:**
  - It fills cols 5–19, rows 7–21: a 3×3 grid of 5×5 tiles.
  - The centre tile is the hub. It is fixed and painted teal.
  - The other 8 tiles (A–H) are each built as one solid piece.
  - The search script is `maze-solver.cjs` and the drawing script is `maze-render.cjs`. The data is in `ledger-maze.json` (seed 42).
- **Exits lead across the hall, not to the nearest door:**
  - North goes to the Archive (doom hall 14).
  - West goes to the Collector (doom hall 10).
  - East goes to the Auditor (doom hall 10).
- **Turn table** (clockwise, from the Hub layout; turn them back after each run):

  | Scene | Tiles to turn |
  |---|---|
  | North run | A 270°, C 270° |
  | West run | E 270°, F 270° |
  | East run | C 270°, D 270°, G 90° |
  | Final | E 90° |
  | Lure to Hub (the seal) | G 180° |

- **Presets:** `the stacks`, `the hub`, `doom <colour>` (that colour's doom shelf, with its power), and `debtors` (2 ghosts, every End round).
- **Doom shelf:** each End round it moves 2 squares and crushes anything it can't push for 400. On an Enemy-phase roll of 5–6 it flanks the hero at the back. A finished exit still opens: its hall still hunts the party, but the office behind it is empty.
- **The Final Account:** run `node gm-tools/surety.cjs JBCX bell <destroyed colours>`, e.g. `bell black,red`.
  - Every colour not destroyed joins Old Surety.
  - A doom shelf the party slipped past keeps its damage.
  - Colours nobody picked arrive at full health.

## Running the campaign with the adventure stepper (from 2026-11)
The whole campaign is built into the app as the **Eighth Gate** adventure preset (`public/adventure.js`).
1. Open Loot & campaign, then Adventure → **Load the Eighth Gate** → **Save to the game**. Optionally, **Forge this adventure's loot**: boss scenes get the most set pieces.
2. In Headquarters, use the 📜 bar to choose the act and scene. It previews what will be summoned. Press **Begin scene**; later waves arrive on End round. Press **Scene clear** to move on; the bar lists that scene's loot cards.
3. For room JBCX, pick Act II → The Zombie Clot. Act II's foes are sized to the party as it is when that first scene begins; use ↻ to measure the party again.
4. The gm-tools presets still work for one-off moments: narration, the Rakshasa, `surety.cjs` for Old Surety's stones.
