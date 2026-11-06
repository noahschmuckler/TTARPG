// Packs /public into worker/assets.gen.js so the Worker serves pages itself
// (one script upload, no separate static-asset upload step).
import fs from 'node:fs';
import path from 'node:path';
const PUB = 'public';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
const out = {};
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (TYPES[path.extname(f)]) out['/' + path.relative(PUB, p).split(path.sep).join('/')] = { type: TYPES[path.extname(f)], body: fs.readFileSync(p, 'utf8') };
  }
})(PUB);
fs.writeFileSync('worker/assets.gen.js', `export default ${JSON.stringify(out)};\n`);
console.log(`bundled ${Object.keys(out).length} files`);
