# Delvers' Ledger

Phone-first hero sheets and a GM headquarters for a tabletop dungeon crawl played with real miniatures and real dice. The app does all the math; players just roll, count, and tap.

- **Players** scan a QR code, forge a hero, and play from their phone: health and energy orbs, an Attack button that tells them how many d6 to roll, tappable minions, powers that glow when charged, and loot reveals.
- **GM** (desktop or tablet) sees every hero live and can change anything: damage, healing, energy, summon foes onto a hero, hand out loot, end the round, undo.
- **Loot cards**: print QR treasure cards, hide them on the board, and players scan them to claim the item.

## Rules in one minute

| Thing | How it works |
|---|---|
| Turn | A move + one action (Attack, Power or Sprint), in any order; the move can be split around the action. **Attack powers** ("Make an attack with…": Thousand Cuts, Lantern Volley, Emberburst) open the attack roll and count as that same action. **Difficult terrain** costs 2 squares per square; leaps, teleports and swaps ignore it. Move: Ironclad/Runepriest/Arcanist 5, Ranger 6, Shadowblade 7. Reach: Ironclad and Shadowblade adjacent; Runepriest 6″, Arcanist 8″, Ranger 12″. |
| Position | **High ground** and **Flanking** each add +1 die (toggles on the attack sheet). Attacking **from hiding** adds +3. Walking away from adjacent foes gives each a **free blow** (*Break away* on the phone); movement powers avoid it. **Surrounded** (3+ foes) or attacked **from higher ground**: +1 defense die. |
| Positional powers | Every class power moves the hero or moves foes (leap, teleport, grapple, vanish, push, pull, taunt, pin, swap). Do it on the table, then tap who it caught; tap twice for **slammed** (into a wall, a foe or off a ledge) = +1 hit. Full text on the in-app **Rules** page. |
| Attack | Roll your **dice pool** of d6s. Every die showing **4+** is a hit, against every foe. Enter how many hits and how many 6s; that banks a **pool of hits**. |
| Spending hits | Tap a minion to slay it (1 hit). Tap an elite or boss to strike it (1 hit = your Damage per Hit, less its armor). 6s are crits (×2, Shadowblade ×3) and are spent on big foes first. "Slay one on the table" spends a hit on an untracked minion. You can tap foes on allies too. Unspent hits vanish at End round. |
| Foe abilities | Tick presets when summoning an elite or boss (or edit them on the board) and the app runs them: **Enrage**, **Stoneskin**, **Call the Horde** (at half health, once), **Summoner**, **Regenerate** (every End round), **Sweeping Blows**, **Energy Leech** (enemy phase), **Thick Hide** (6s don't crit it), **Death Throes** (explodes on death). Every phone gets an alert when one fires. Defined in `FOE_ABILITIES` in `public/engine.js`. |
| Scaled bosses | When summoning an elite or boss, **Scale health to the party** (on by default) sets its health from the heroes' current gear, dice, crits and the foe's armor so it lasts about N rounds (boss 4, elite 2). **⟳ Rescale** re-fits a living foe to the party as it is now, keeping its health %. A fresh party of 3 makes a 4-round boss ~8,500 health; after a full campaign it's ~30,000+. |
| Foes | All hit on 4+. They differ by health, armor % (cuts hero damage), attacks per enemy phase, damage per blow, and an optional ability note shown to players. Defaults: minion 1 hp / 0% / 1×60, elite 2,000 / 20% / 2×200, boss 9,000 / 35% / 3×450. |
| Energy | Gained per kill (more for elites/bosses) and at the end of every round. Spend it on your three powers. |
| Enemy phase | GM taps **Enemy phase**. Every hero with foes on them gets a prompt: roll one die per enemy attack (bosses attack 3 times); each die showing 1–3 is a blow that lands. Heroes with 30%+ armor are only hit on 1–2. |
| Damage taken | Blows add up by enemy (minion 60, elite 250, boss 600); your Armor % is subtracted, then any Ward soaks the rest. The GM can also deal damage directly. |
| Assigning foes | Summon foes onto a hero or leave them roaming. ⇄ on any minion group moves some or all of them to another hero (or back to roaming); elites and bosses have a dropdown. |
| Progression | No XP or levels: heroes grow only through loot. Item power and rarity climb scene by scene. |
| Item sets | Six four-piece sets (Thunderforge, Emberheart, Stonewarden, Deepdelver, Runekeeper, Vaultbreaker), each in its own colour. **One equipped piece unlocks the set's power**; every extra piece strengthens it, and 2/3/4 pieces add stat bonuses. Defined in `public/sets.js`. |
| Hidden synergies | Eight secret combinations of pieces from two different sets (e.g. Thunderforge + Emberheart = "Forge and Flame"). They add stats and strengthen set powers, and are announced on the phone the first time a hero equips the combination. |
| Treasure caches | One QR card can hold several items: chests (2), elite drops (2), boss hoards (4, always something rare or better). Whoever scans it gets everything, then the party compares and trades. |
| The Rakshasa | A merchant the GM opens at rest points from the **The Rakshasa** panel in Headquarters (which also deals, reveals and clears Three-Card Crown). Players sell satchel items for **Favour** (common 1, magic 2, rare 3, set 4, legendary 6), buy permanent **boons** (+150 health, +40 damage, +1 die once…; each repeat costs +1) and single-use **wares** (one per turn, free to use). He also deals **Three-Card Crown** on every challenged phone at once: 3 cards, one redraw of up to 2, wager 0–3 Favour or play for a prize; ties go to the house. Data in `public/merchant.js`, art in `public/art.js`. |
| Items | Common → Magic → Rare → Legendary → Set. Tap any item (satchel or equipped) to give it to another hero. Legendaries and some synergies add an extra attack die or Cleave (each point of cleave turns every 6 rolled into one extra minion-only hit). Minion-slaying powers likewise add minion-only hits to your pool. |

Five callings: Ironclad (tank), Runepriest (support), Ranger (many dice), Arcanist (big hits, fragile), Shadowblade (crits, energy on kills). All numbers live in `public/engine.js`, so tune away.

## Run it locally

```bash
npm install
npm start            # http://localhost:8787
npm test
```

Phones on the same Wi-Fi can open `http://<your-computer-ip>:8787`.

## Deploy (pick one)

**Cloudflare (recommended, free, always on).** Uses Workers + one Durable Object per game.
```bash
npx wrangler login
npm run cf:deploy    # prints https://delvers-ledger.<you>.workers.dev
```

**Railway.** New project → Deploy from GitHub repo → it runs `npm start` and sets `$PORT`. Add a volume mounted at `/app/data` (or set `DATA_DIR`) if you want games to survive redeploys.

**Your Linux box.** `npm install && PORT=8787 npm start` behind any reverse proxy with HTTPS (the WebSocket lives at `/ws`).

## Game-night flow

1. Open the site → enter a GM PIN → **New game**. You land in Headquarters with a 4-letter code.
2. Click **Join QR** and show it to the table. Each player forges a hero.
3. Each round: summon or move foes onto heroes, let players attack and use powers, tap **Enemy phase** (everyone rolls defense at once), then **End round**.
4. Open **Loot & campaign**, set the party's callings and your scenes (chests, named elites, bosses), and optionally choose how many **featured sets** to include and pin any you want (the preview shows how many sets will complete and how many hidden synergies become possible), then press **Generate campaign loot**. For a party of 3, 4 scenes × 3 chests with 1/1/2/1 elites, a mid-boss in scene 2 and a final boss (42 items) completes 4 sets; 5 featured sets gives 4 complete sets and 5–6 synergies, 6 gives 3 complete and all 8. Print each scene's cards (each starts on a new page) and tape them into chests and under elite/boss minis. Or print **Loot cards** ahead of time and hide them in the terrain. Tap a card on screen to flip it and see the item inside; printing always uses the QR side.
5. **💾 Save** downloads the whole game (heroes, gear, foes, loot, chronicle) as a backup file; **⟲ Restore** loads one into the room (Undo reverses it). **Killing blows** in the side panel ranks heroes by bosses, elites and minions slain.
6. Click any hero's **Gear** line to inspect their stats and items (and equip, give or destroy them). Mistakes? **Undo** walks back the last 40 actions. A player without a phone? Click ↗ on their card to open their sheet.

## Layout

```
public/engine.js   rules, classes, items: shared by server and browser
public/*.html      index (join), play (phone), gm (headquarters), cards (print)
server/room.js     room authority: permissions + undo
server/node.js     Node host (local / Railway / Linux)
worker/index.js    Cloudflare host (Durable Object)
```

## Board snapshots (camera)

Headquarters → **📷 Board**. Print the markers (**Print markers**: four 2″ corner cards plus 0.75″ tokens), put the corner cards flush into the board's corners and a token on each piece where the camera can see it. Tap **📷 Photo** (or use the live camera, optionally every 15 s) with all four corners in view. The app finds the markers in the browser (pure-JS ArUco detection, `public/board-vision.js`), maps them through a perspective transform onto the grid, and:

- shows a live **board map** in Headquarters and on every phone (your hero highlighted),
- marks foes whose bases touch a hero as **engaged** with that hero,
- makes the minions on the board the app's minion list (optional).

Markers: #0–3 corners, #4–11 heroes, #12–29 elites/bosses (assigned automatically, shown as ◰ on their cards), #30–89 minions. In synthetic tests (36″×24″ board, 30–55° camera tilt) 0.75″ markers were found 100% of the time with ~0.03″ position error and no false readings. Height isn't read from photos.

## Rules page

`/rules.html` (the **Rules** button on the phone and in Headquarters) is the full rulebook. Its class, power, item-set and foe-ability sections are generated from the game data.

## Later: camera + projector

See `docs/design.md`.
