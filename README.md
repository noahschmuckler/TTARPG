# Delvers' Ledger

Phone-first hero sheets and a GM headquarters for a tabletop dungeon crawl played with real miniatures and real dice. The app does all the math; players just roll, count, and tap.

- **Players** scan a QR code, forge a hero, and play from their phone: health and energy orbs, an Attack button that tells them how many d6 to roll, tappable minions, powers that glow when charged, and loot reveals.
- **GM** (desktop or tablet) sees every hero live and can change anything: damage, healing, energy, summon foes onto a hero, hand out loot, end the round, undo.
- **Loot cards**: print QR treasure cards, hide them on the board, and players scan them to claim the item.

## Rules in one minute

| Thing | How it works |
|---|---|
| Attack | Roll your **dice pool** of d6s. Every die showing the target's number (4+ for minions, 5+ for elites/bosses) is a hit. Enter the count; the app does the rest. |
| Minions | One hit = one dead minion. Tap a minion on your phone to slay it directly, or use "+N slain" if the GM isn't tracking them in the app. |
| Elites / bosses | Each hit deals your **Damage per Hit** (hundreds). Each 6 is a crit (×2, Shadowblade ×3). |
| Energy | Gained per kill (more for elites/bosses) and at the end of every round. Spend it on your three powers. |
| Damage taken | GM enters raw damage; your Armor % is subtracted, then any Ward soaks the rest. |
| Items | Common → Magic → Rare → Legendary. Legendaries can add an extra attack die or Cleave (each 6 kills an extra minion). |

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
3. Summon foes onto heroes (or leave them roaming), let players attack, hit **End round** when everyone has gone.
4. Print **Loot cards** ahead of time and hide them in the terrain.
5. Mistakes? **Undo** walks back the last 40 actions. A player without a phone? Click ↗ on their card to open their sheet.

## Layout

```
public/engine.js   rules, classes, items: shared by server and browser
public/*.html      index (join), play (phone), gm (headquarters), cards (print)
server/room.js     room authority: permissions + undo
server/node.js     Node host (local / Railway / Linux)
worker/index.js    Cloudflare host (Durable Object)
```

## Later: camera + projector

See `docs/design.md`.
