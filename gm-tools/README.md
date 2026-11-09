# GM helper tools (used to run session 1 of room JBCX)

- `gm.cjs ROOM '<json action or array>'` sends actions as the GM (PIN from `$PIN`, default 1234). `$Name` = a hero's id, `$foe:Name` = a foe's id. No actions = print the room.
- `gm.cjs ROOM @scene` runs a preset from `scenes.json`, e.g. `node gm-tools/gm.cjs JBCX '@stacks wake'`. Set `WS=ws://localhost:8787` to aim any script at a local server.
- `surety.cjs ROOM bell` rings the Audit Bell: Old Surety rises with the powers of the surviving book stacks, which become his orbiting stones. `surety.cjs ROOM sync` strips a power after its stone is knocked down.
- `claim.cjs ROOM Hero "cache label prefix"` opens a planned cache for a hero.
- `scenes.json` holds the named scene presets (meadow, ruins, grove, bodytaker, tunnel wave, warren, release the beast, gnawhole, clot, spores gone, seals, leak, tentacles, kraken rises, regrow, and the Ledger Hall: eye closes, counting house, contract, clerks, overdue, auditor, collector, defaulted, stacks wake, surety falls, the ledger, strike rakshasa, strike kraken).
- `backups/` holds full room snapshots. The same snapshot is stored in Cloudflare KV, namespace `delvers-ledger-backups` (id 28792ea414294c028b8258ff9a84852c), key `JBCX/2026-11-08-after-gnawhole`.

Run from the repo root: `node gm-tools/gm.cjs JBCX`.
