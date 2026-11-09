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
  | Clerks' Floor: 16 desks, ghost clerks | 21–30 |
  | Auditor's Office (west) / Collections Window (east) | 11–22 |
  | Filing Stacks: shelf maze, the 5 sleeping book stacks | 11–19 |
  | Archive of Bad Debts (NW, chest) / Strongroom (NE, 2 locked chests, key on the Collector) | 1–9 |
  | The Final Account: raised dais, Old Surety, the Great Ledger before the exit | 2–9 |

- **Minions:** ghost clerks, about 35–40. They wake when fighting happens within 2 of a desk. "Overdue": a clerk that dies comes back once, unless it's finished off before the next End round.
- **Elites:** each carries one of the three folios that open the Final Door.

  | Elite | Presets | Notes |
  |---|---|---|
  | The Auditor (Belashyrra) | Energy Leech + Sweeping Blows | Hidden doesn't work within sight of it. Folio I |
  | The Collector (daemonette) | Enrage + Death Throes | "Interest compounds". Folio II and the strongroom key |
  | The Defaulted (corpse flower) | Summoner + Regenerate | Folio III |

- **The boss: Old Surety**, the guarantor of every unpaid debt (the user's sad grey gnome/troll mini, giant at game scale, 4×4 base).
- **The book stacks as ioun stones:**
  - The 5 coloured foam stacks sleep in the Filing Stacks. Smash what you can before the Audit Bell.
  - The survivors fly to Old Surety and orbit him, each granting him its ability:

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
5. The Filing Stacks: `@stacks wake` the first time a stack is struck. At the end of the third round, run `node gm-tools/surety.cjs JBCX bell`.
6. The dais:
   - Move each orbiting stone one square clockwise every End round.
   - When a stone falls, run `node gm-tools/surety.cjs JBCX sync`.
   - When Old Surety drops, run `@surety falls`, then `@the ledger`.
7. The choice: `@strike rakshasa` or `@strike kraken`.

## Still to prepare
- The "half-price boons" reward for striking the Rakshasa's debt isn't built in the app yet. Build it only if the party picks that ending.

## The Filing Stacks (draft, see `ledger-stacks-maze.png`)
- **The lure:** a single gap in the shelf line leads into the hub, which seals behind the party.
- **The hub:** the teal walls never move. It has three exits, each blocked by a 1×1 colour shelf.
  - The books on each shelf hint at its power.
  - The party picks one shelf. It slides aside and becomes the doom shelf at the far end of that run's hall.
- **The runs:** Auditor (west), Collector (east), Archive (north-west under the dais). Each run's maze ends in a 1-wide doom hall that seals behind the last hero.
- **Doom shelf, every End round:**
  - It advances 2 squares and pushes whatever is in front of it.
  - Anyone who can't be pushed any further is crushed for 400.
  - 2 debtor ghosts appear in front of it.
- **Doom shelf, Enemy phase:** on a 5–6 it phases out of the wall beside the back hero and attacks. While it's gone, the way to the door is open.
- **After the runs:**
  - A doom shelf the party destroyed never reaches Old Surety.
  - One they slipped past joins him.
  - The 2 colours nobody picked always join him.
- **Shelves to bring:** 8 × 1×2, 9 × 1×4, 6 × 1×6, plus the five colour shelves.
