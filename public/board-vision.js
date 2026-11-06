// Board vision: find square markers in a photo and place them on the board grid.
// Needs the classic scripts vendor/aruco/cv.js and vendor/aruco/aruco.js (globals CV and AR).
import { MARKER_CODES } from './marker-codes.js';
import { cornerPoints, MARKER_RANGES } from './engine.js';

const bits = id => MARKER_CODES[id].map((b, i) => b.toString(2).padStart(8, '0')).join('').slice(0, 16);

// Printable marker: 4×4 data cells, 1-cell black border, 1-cell white quiet zone (8×8 units).
export function markerSVG(id) {
  const code = bits(id);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><rect width="8" height="8" fill="#fff"/><rect x="1" y="1" width="6" height="6" fill="#000"/>`;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (code[y * 4 + x] === '1') svg += `<rect x="${x + 2}" y="${y + 2}" width="1" height="1" fill="#fff"/>`;
  return svg + '</svg>';
}

let detector = null;
function getDetector() {
  if (detector) return detector;
  const AR = window.AR;
  if (!AR) throw new Error('Marker detector not loaded');
  AR.DICTIONARIES.DL_4X4_90 = { nBits: 16, tau: 4, codeList: MARKER_CODES };
  detector = new AR.Detector({ dictionaryName: 'DL_4X4_90', maxHammingDistance: window.DL_TAU || 1 }); // exact matches only: no false positives in testing
  return detector;
}

// The library's detect() is tuned for 640×480 webcams. Tabletop photos are big and the markers
// small, so run its pipeline with smaller size limits, at more than one threshold window,
// and merge the results.
export function detectMarkers(img, { kernels = [2, 4, 8], minFrac = 0.004, minEdge = 6 } = {}) {
  const d = getDetector(), CV = window.CV;
  const out = new Map();
  CV.grayscale(img, d.grey);
  for (const k of kernels) {
    CV.adaptiveThreshold(d.grey, d.thres, k, 7);
    d.contours = CV.findContours(d.thres, d.binary);
    let c = d.findCandidates(d.contours, img.width * minFrac, 0.05, minEdge);
    c = d.clockwiseCorners(c);
    c = d.notTooNear(c, 4);
    for (const m of d.findMarkers(d.grey, c, 49)) {
      const prev = out.get(m.id);
      if (!prev || m.hammingDistance < prev.hammingDistance) out.set(m.id, m);
    }
  }
  return [...out.values()];
}

// Solve the 3×3 perspective transform mapping 4 source points onto 4 destination points.
export function homography(src, dst) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i], [u, v] = dst[i];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
  }
  // Gaussian elimination with partial pivoting
  for (let c = 0; c < 8; c++) {
    let p = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    if (Math.abs(A[c][c]) < 1e-12) throw new Error('Corner cards are in a straight line');
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}
export function project(H, x, y) {
  const w = H[6] * x + H[7] * y + H[8];
  return [(H[0] * x + H[1] * y + H[2]) / w, (H[3] * x + H[4] * y + H[5]) / w];
}

// Draw any image/video source into a working canvas, downscaled so detection stays quick.
export function toCanvas(source, maxSide = 2600) {
  const sw = source.videoWidth || source.naturalWidth || source.width, sh = source.videoHeight || source.naturalHeight || source.height;
  const k = Math.min(1, maxSide / Math.max(sw, sh));
  const c = document.createElement('canvas');
  c.width = Math.round(sw * k); c.height = Math.round(sh * k);
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return c;
}

// Returns { ok, error, cornersFound, tokens: [{id,x,y}], markers (image space), ms }
export function detectBoard(canvas, w, h, opts = {}) {
  const t0 = performance.now();
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const found = detectMarkers(img, opts);
  const byId = new Map();
  for (const m of found) if (m.id < MARKER_CODES.length && !byId.has(m.id)) byId.set(m.id, m);
  const markers = [...byId.values()].map(m => ({ id: m.id, corners: m.corners.map(p => [p.x, p.y]), cx: m.corners.reduce((t, p) => t + p.x, 0) / 4, cy: m.corners.reduce((t, p) => t + p.y, 0) / 4 }));
  const [c0, c1] = MARKER_RANGES.corners;
  const corners = [0, 1, 2, 3].map(i => markers.find(m => m.id === c0 + i));
  const cornersFound = corners.map((m, i) => (m ? i : null)).filter(i => i != null);
  const ms = Math.round(performance.now() - t0);
  if (cornersFound.length < 4) return { ok: false, error: 'missing-corners', cornersFound, markers, tokens: [], ms };
  const H = homography(corners.map(m => [m.cx, m.cy]), cornerPoints(w, h));
  // Measure each marker's black square on the board: tokens are printed ~0.4–1.2″ across;
  // anything else is a misread of terrain, grid lines or shadows.
  const sideOn = m => { const p = m.corners.map(([x, y]) => project(H, x, y)); let t = 0; for (let i = 0; i < 4; i++) t += Math.hypot(p[i][0] - p[(i + 1) % 4][0], p[i][1] - p[(i + 1) % 4][1]); return t / 4; };
  const rejected = [];
  const tokens = markers.filter(m => m.id > c1).map(m => { const [x, y] = project(H, m.cx, m.cy); return { id: m.id, x, y, side: sideOn(m) }; })
    .filter(t => { const ok = t.x > -1 && t.y > -1 && t.x < w + 1 && t.y < h + 1 && t.side > (opts.minSide ?? 0.3) && t.side < (opts.maxSide ?? 1.4); if (!ok) rejected.push(t.id); return ok; });
  return { ok: true, cornersFound, markers, tokens, rejected, ms, H };
}
