# Delvers' Ledger: notes for Claude

## Keep the rules page current
`public/rules.html` is the in-app rules page (linked from the player phone and from Headquarters).
**Whenever a game mechanic changes, update `public/rules.html` in the same change.**
- The Callings, item-set and foe-ability sections are generated from `CLASSES`, `SETS` and
  `FOE_ABILITIES`, so data changes show up automatically. Check the prose still agrees.
- The prose sections (round, moving, height, attacking, powers & position, breaking away,
  defending, how foes move, board snapshots, energy, loot, the Rakshasa) are hand-written: edit them when rules change.
- Also keep the rules table in `README.md` in step.

## Layout
- `public/engine.js`: all rules (pure functions). `public/sets.js`: item sets and synergies. `public/merchant.js`: the Rakshasa (sell values, boons, wares, Three-Card Crown). `public/art.js`: procedural SVG cards and ware icons.
- `server/room.js`: permissions and undo. `server/node.js` / `worker/index.js`: hosts.
- `public/play.html` (phone), `gm.html` (Headquarters), `cards.html` (loot and campaign planner), `rules.html`,
  `board.html` (photo → board map), `markers.html` (printable markers).
- `public/board-vision.js` + `vendor/aruco/`: marker detection and perspective mapping. `marker-codes.js`: the 90 marker codes.

## Checks before pushing
- `npm test` (engine tests).
- Drive the real UI with Playwright against `npm start` (port 8787) for any UI change.
- Deploy: `npm run cf:deploy` (bundles `public/` into the Worker).
