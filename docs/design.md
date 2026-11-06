# Design notes

## Goals
1. Players never do math or track stats on paper. Phone shows state; physical dice decide outcomes.
2. GM has instant, total visibility and control. Everything is editable; everything is undoable.
3. Zero onboarding: scan QR, type a name, pick a calling.
4. Original dwarven art-deco look: brass on basalt, chamfered plates, stepped rules, sunbursts.

## Core loop
- Players roll a d6 pool; hits are dice ≥ target number (minions 4+, elites/bosses 5+, GM-adjustable).
- Minions die to one hit. Elites/bosses take Damage-per-Hit × hits, 6s crit.
- Energy: +per kill, +per round; spent on three class powers (buffs, wards, heals, smites).
- Loot: GM grants or players claim QR cards; items add large-number stats that the app sums.

## Architecture
Server-authoritative state per room, pushed over WebSockets. `engine.apply(state, action)` is pure;
`RoomCore` adds GM/player permissions and an undo stack; Node and Cloudflare Durable Objects are thin hosts.

## Phase 2 ideas (after the game is fun)
- **Board vision:** small ArUco/AprilTag markers on mini bases; an overhead camera (phone or webcam) snapshot →
  OpenCV.js in the GM browser detects marker IDs and positions → a virtual map. Markers map to heroes / foes, so
  engagement ("these 3 minions are next to Brokk") could be automatic.
- **Projector:** a `/table` page rendered full-screen through the projector: spotlight on the active hero,
  pulsing rings for wards, embers on kills, a boss health bar along the edge. Calibrate with four corner taps.
- Turn order tracker, boss phases, enemy intent cards, persistent campaigns.
