// Procedural art for the Rakshasa's games and wares: card faces, card back and consumable icons.
// Dwarven art deco: brass on basalt, chamfered frames, sunbursts. All inline SVG.
import { parseCard, SUIT_LABEL } from './merchant.js';

const SUIT_COLOR = { swords: '#cfd8e3', flames: '#ff8a3d', crowns: '#f3d98e', skulls: '#e9e2d0', joker: '#ffb347' };

// Suit emblems drawn in a 40×40 box.
const EMBLEM = {
  swords: c => `<path d="M20 2 L23.5 7 L23.5 26 L16.5 26 L16.5 7 Z" fill="${c}"/><path d="M20 4 L20 25" stroke="#0007" stroke-width="1"/>
    <rect x="10" y="26" width="20" height="3.2" rx="1" fill="#c9a24d"/><rect x="18.4" y="29" width="3.2" height="6" fill="#7a5a2a"/><circle cx="20" cy="37" r="2.4" fill="#c9a24d"/>`,
  flames: c => `<path d="M20 2 C27 10 33 15 31 25 C30 33 25 38 20 38 C13 38 8 33 9 25 C10 19 14 16 15 10 C17 14 18 16 19.5 18.5 C21 12 21.5 7 20 2 Z" fill="${c}"/>
    <path d="M20 17 C24 22 26 25 25 30 C24 34 22 35.5 20 35.5 C17 35.5 15 33 15.5 29.5 C16 26 18.5 24 18.5 20.5 C19.4 22.5 19.8 23.5 20.4 24.5 C21 21.5 21 19 20 17 Z" fill="#ffe08a"/>`,
  crowns: c => `<path d="M5 29 L7.5 11 L14.5 20 L20 7 L25.5 20 L32.5 11 L35 29 Z" fill="${c}"/><rect x="5" y="29" width="30" height="5.5" rx="1" fill="${c}"/>
    <rect x="5" y="30.7" width="30" height="2" fill="#9b7a2c"/><circle cx="7.5" cy="10" r="2.2" fill="#e05252"/><circle cx="20" cy="6" r="2.4" fill="#5fd3c4"/><circle cx="32.5" cy="10" r="2.2" fill="#e05252"/><circle cx="20" cy="24" r="2.2" fill="#9b2335"/>`,
  skulls: c => `<path d="M20 4 C29 4 33 10 33 17 C33 22 30.5 25 29 26.5 L29 31 C29 33 27.5 34 25.5 34 L14.5 34 C12.5 34 11 33 11 31 L11 26.5 C9.5 25 7 22 7 17 C7 10 11 4 20 4 Z" fill="${c}"/>
    <ellipse cx="14.8" cy="18.5" rx="4" ry="4.4" fill="#1a1510"/><ellipse cx="25.2" cy="18.5" rx="4" ry="4.4" fill="#1a1510"/><path d="M20 22.5 L17.8 27 L22.2 27 Z" fill="#1a1510"/>
    <path d="M15 30 L15 34 M18.4 30 L18.4 34 M21.6 30 L21.6 34 M25 30 L25 34" stroke="#1a1510" stroke-width="1.2"/>`,
  joker: () => `<path d="M7 9 L13 15 L9 4 Z M33 9 L27 15 L31 4 Z" fill="#c9661c"/>
    <path d="M20 7 C30 7 35 14 35 22 C35 31 28 37 20 37 C12 37 5 31 5 22 C5 14 10 7 20 7 Z" fill="#ffb347"/>
    <path d="M20 26 C24 26 28 28.5 28 31.5 C28 34.5 24 36 20 36 C16 36 12 34.5 12 31.5 C12 28.5 16 26 20 26 Z" fill="#fff3dc"/>
    <path d="M20 8 L20 14 M14 9 L16 15 M26 9 L24 15 M6.5 19 L11 20.5 M6 24 L10.5 24 M33.5 19 L29 20.5 M34 24 L29.5 24" stroke="#3a1d08" stroke-width="2" stroke-linecap="round"/>
    <path d="M11 20 Q15 17 18 20.5 Q15 23 11 20 Z M29 20 Q25 17 22 20.5 Q25 23 29 20 Z" fill="#7ad36a"/><circle cx="15" cy="20.3" r="1.2" fill="#111"/><circle cx="25" cy="20.3" r="1.2" fill="#111"/>
    <path d="M17.5 26 L22.5 26 L20 29 Z" fill="#7a2e2e"/><path d="M20 29 L20 31 M20 31 Q17.5 33 16 31.5 M20 31 Q22.5 33 24 31.5" stroke="#3a1d08" stroke-width="1.2" fill="none"/>`,
};

const FRAME = 'M8 2 H92 L98 8 V142 L92 148 H8 L2 142 V8 Z';
const rays = (cx, cy, n, r, col, op) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * r).toFixed(1)}" y2="${(cy + Math.sin(a) * r).toFixed(1)}" stroke="${col}" stroke-opacity="${op}" stroke-width="1.2"/>`; }).join('');

// A playing card. `code` like "flames:7" or "joker:0". width in px.
export function cardSVG(code, { width = 84, cls = '' } = {}) {
  const c = parseCard(code);
  const col = SUIT_COLOR[c.suit];
  const num = c.joker ? '★' : String(c.v);
  const label = c.joker ? 'RAKSHASA' : SUIT_LABEL[c.suit].toUpperCase();
  return `<svg class="pcard ${cls}" viewBox="0 0 100 150" width="${width}" height="${width * 1.5}" role="img" aria-label="${c.joker ? 'Rakshasa joker' : `${c.v} of ${SUIT_LABEL[c.suit]}`}">
  <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#241e15"/><stop offset="1" stop-color="#0e0c09"/></linearGradient></defs>
  <path d="${FRAME}" fill="url(#cg)" stroke="#c9a24d" stroke-width="2.4"/>
  <path d="M11 7 H89 L93 11 V139 L89 143 H11 L7 139 V11 Z" fill="none" stroke="#c9a24d" stroke-opacity=".45" stroke-width=".8"/>
  ${rays(50, 75, 28, 44, col, 0.18)}
  <circle cx="50" cy="75" r="27" fill="#0e0c09" stroke="${col}" stroke-opacity=".55" stroke-width="1.2"/>
  <g transform="translate(26 51) scale(1.2)">${EMBLEM[c.suit](col)}</g>
  <text x="13" y="24" font-family="Big Shoulders Display, Oswald, sans-serif" font-weight="900" font-size="20" fill="${col}">${num}</text>
  <text x="87" y="138" font-family="Big Shoulders Display, Oswald, sans-serif" font-weight="900" font-size="20" fill="${col}" text-anchor="end">${num}</text>
  <text x="50" y="124" font-family="Big Shoulders Display, Oswald, sans-serif" font-weight="700" font-size="8" letter-spacing="2" fill="${col}" fill-opacity=".8" text-anchor="middle">${label}</text>
</svg>`;
}

export function cardBackSVG({ width = 84, cls = '' } = {}) {
  let lattice = '';
  for (let y = 14; y < 146; y += 12) for (let x = 12; x < 96; x += 12) lattice += `<path d="M${x} ${y - 5} L${x + 5} ${y} L${x} ${y + 5} L${x - 5} ${y} Z" fill="none" stroke="#c9a24d" stroke-opacity=".22" stroke-width=".8"/>`;
  return `<svg class="pcard back ${cls}" viewBox="0 0 100 150" width="${width}" height="${width * 1.5}" role="img" aria-label="face-down card">
  <path d="${FRAME}" fill="#1a120c" stroke="#c9a24d" stroke-width="2.4"/>
  <clipPath id="cb"><path d="M11 7 H89 L93 11 V139 L89 143 H11 L7 139 V11 Z"/></clipPath>
  <g clip-path="url(#cb)">${lattice}${rays(50, 75, 36, 60, '#c9a24d', 0.25)}</g>
  <path d="M11 7 H89 L93 11 V139 L89 143 H11 L7 139 V11 Z" fill="none" stroke="#c9a24d" stroke-opacity=".6" stroke-width=".8"/>
  <path d="M50 46 L72 75 L50 104 L28 75 Z" fill="#0e0c09" stroke="#c9a24d" stroke-width="1.6"/>
  <path d="M36 75 Q50 61 64 75 Q50 89 36 75 Z" fill="#7ad36a" stroke="#c9a24d" stroke-width="1"/><ellipse cx="50" cy="75" rx="2.4" ry="7" fill="#111"/>
</svg>`;
}

// Consumable icons in a brass medallion (48×48).
const ICON = {
  draught: `<path d="M20 9 H28 V16 C34 18.5 37 23 37 29 C37 36 31 41 24 41 C17 41 11 36 11 29 C11 23 14 18.5 20 16 Z" fill="#3a1418" stroke="#e9e2d0" stroke-width="1.5"/>
    <path d="M12.6 30 C14 35 18 39 24 39 C30 39 34 35 35.4 30 Z" fill="#e0384a"/><circle cx="19" cy="33" r="1.6" fill="#ff9aa6"/><circle cx="27" cy="35" r="1.1" fill="#ff9aa6"/>
    <rect x="19" y="5.5" width="10" height="5" rx="1.2" fill="#9b6a3a"/><path d="M17 22 Q15 26 16 29" stroke="#fff" stroke-opacity=".5" stroke-width="1.3" fill="none"/>`,
  spark: `<path d="M9 31 C9 27 15 25.5 24 25.5 C31 25.5 36 27 39 25 C41 24 42.5 25 41.5 26.5 C39 30 35 34 24 34 C15 34 9 33.5 9 31 Z" fill="#c9a24d"/><path d="M18 34 L30 34 L28 38 L20 38 Z" fill="#9b7a2c"/>
    <path d="M10 30 C7.5 29 6.5 26.5 8 25" stroke="#c9a24d" stroke-width="2" fill="none"/>
    <path d="M24 24 C20 19 22 14 25 9 C26 13 30 15 29 20 C28.5 22.5 26.5 24 24 24 Z" fill="#5fd3c4"/><path d="M25 22 C23.5 19.5 24.5 16.5 26 14.5 C26.5 17 28 18 27.5 20 C27.2 21.3 26.2 22 25 22 Z" fill="#d9fff9"/>
    <path d="M33 10 L34 13 L37 14 L34 15 L33 18 L32 15 L29 14 L32 13 Z" fill="#aef7ee"/>`,
  mirror: `<ellipse cx="24" cy="19" rx="11" ry="13" fill="#c9a24d"/><ellipse cx="24" cy="19" rx="8.5" ry="10.5" fill="#bcd3e6"/>
    <path d="M18 14 Q21 10.5 25 11" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M17.5 20 L22 15.5" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/>
    <rect x="21.5" y="31.5" width="5" height="11" rx="1.5" fill="#9b7a2c"/><circle cx="24" cy="43" r="2.2" fill="#c9a24d"/>`,
  smoke: `<circle cx="24" cy="30" r="9" fill="#4a4a50"/><circle cx="21" cy="27" r="2.6" fill="#8a8a95"/>
    <path d="M24 21 C20 17 26 14 23 10 M28 20 C31 16 27 13 31 9 M19 22 C15 19 18 15 15 12" stroke="#b9b9c4" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  lightning: `<path d="M19 7 H29 V12 C34 14 36 18 36 23 V37 C36 40 34 42 31 42 H17 C14 42 12 40 12 37 V23 C12 18 14 14 19 12 Z" fill="#1d2433" stroke="#bcd3e6" stroke-width="1.5"/>
    <rect x="18" y="4" width="12" height="4.5" rx="1.2" fill="#9b6a3a"/><path d="M26.5 15 L18.5 28 L24 28 L21 39 L30.5 24 L25 24 Z" fill="#ffe14d"/>
    <circle cx="24" cy="27" r="11" fill="#ffe14d" fill-opacity=".12"/>`,
  knuckle: `<path d="M12 18 C9 15 12 10 16 12.5 C17.5 10 21 10 22 13 L26 13 C27 10 30.5 10 32 12.5 C36 10 39 15 36 18 C39 21 36 26 32 23.5 C30.5 26 27 26 26 23 L22 23 C21 26 17.5 26 16 23.5 C12 26 9 21 12 18 Z" fill="#e9e2d0"/>
    <rect x="15" y="27" width="14" height="14" rx="3" fill="#e9e2d0" transform="rotate(-12 22 34)"/><circle cx="18.5" cy="31" r="1.3" fill="#1a1510"/><circle cx="22" cy="34" r="1.3" fill="#1a1510"/><circle cx="25.5" cy="37" r="1.3" fill="#1a1510"/>`,
};
export function consumableSVG(key, size = 48) {
  return `<svg class="cicon" viewBox="0 0 48 48" width="${size}" height="${size}" role="img" aria-label="${key}">
  <circle cx="24" cy="24" r="23" fill="#14110c" stroke="#c9a24d" stroke-width="1.6"/>${rays(24, 24, 16, 22, '#c9a24d', 0.18)}
  ${ICON[key] || ''}</svg>`;
}
