# GM helper tools (used to run session 1 of room JBCX)

- `gm.cjs ROOM '<json action or array>'` sends actions as the GM (PIN from `$PIN`, default 1234). `$Name` = a hero's id, `$foe:Name` = a foe's id. No actions = print the room.
- `claim.cjs ROOM Hero "cache label prefix"` opens a planned cache for a hero.
- `scenes.json` holds the named scene presets (meadow, ruins, grove, bodytaker, tunnel wave, warren, release the beast, gnawhole, clot, spores gone, seals, leak, tentacles, kraken rises, regrow…).
- `backups/` holds full room snapshots. The same snapshot is stored in Cloudflare KV, namespace `delvers-ledger-backups` (id 28792ea414294c028b8258ff9a84852c), key `JBCX/2026-11-08-after-gnawhole`.

Run from the repo root: `node gm-tools/gm.cjs JBCX`.
