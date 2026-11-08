// node claim.cjs ROOM "Hero" "label prefix"  → claims the first unclaimed loot card whose label starts with prefix
const WebSocket = require('ws');
const [room, hero, label] = process.argv.slice(2);
const ws = new WebSocket(`wss://delvers-ledger.noah-schmuckler.workers.dev/ws?room=${room}`);
ws.on('open', () => ws.send(JSON.stringify({ t: 'hello', role: 'gm', pin: '1234' })));
let done = false;
ws.on('message', m => {
  const d = JSON.parse(m);
  if (d.t === 'welcome') {
    const S = d.state;
    const c = Object.values(S.characters).find(c => c.name.toLowerCase().startsWith(hero.toLowerCase()));
    const card = Object.values(S.loot).find(l => l.label.toLowerCase().startsWith(label.toLowerCase()));
    if (!c || !card) { console.log('missing', !!c, !!card, Object.values(S.loot).map(l => l.label)); process.exit(1); }
    console.log('card', card.card, card.label, 'items:', card.items.map(i => `${i.name} [${i.rarity}${i.set ? ' set:' + i.set : ''}] ${i.slot}`).join(' | '));
    ws.send(JSON.stringify({ t: 'act', action: { type: 'claimLoot', charId: c.id, card: card.card }, rid: 1 }));
  } else if (d.rid === 1) { console.log(d.t, d.msg || ''); process.exit(0); }
});
setTimeout(() => process.exit(1), 15000);
