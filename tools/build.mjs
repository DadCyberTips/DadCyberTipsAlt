/**
 * Builds the publishable site into dist/:
 *   dist/index.html   page with the scripts and stylesheets replaced by one of each
 *   dist/app.js       every script from index.html, in load order, minified, with each
 *                     string containing {CTF} encoded so no flag appears as plain text
 *   dist/app.css      both stylesheets, comments and line breaks removed
 *   dist/img, dist/video, dist/robots.txt, dist/flag-backup   copied as they are
 * The build stops if any flag text other than the honeypots is still readable in dist/.
 *
 *   npm install && npm run build
 */
import { readFileSync, writeFileSync, rmSync, mkdirSync, cpSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { parse } from 'acorn';
import { simple as walk } from 'acorn-walk';
import { minify } from 'terser';

const root = new URL('..', import.meta.url).pathname, out = join(root, 'dist');
const read = f => readFileSync(join(root, f), 'utf8');
// Honeypot flags are meant to be found by people who snoop instead of solving (see README)
const HONEYPOTS = ['{CTF}[C0NS0L3-C0WB0Y]', '{CTF}[R0B0TS-R3AD3R]', '{CTF}[V13W-S0URC3]'];
const hash = s => createHash('sha256').update(s).digest('hex').slice(0, 10);

// Flags are XORed with this key (and the byte position), then base64-encoded. It only stops
// the flags being read or searched for in the files; the page itself decodes them to show them.
const KEY = 'sn4ck-cyb3r';
const encode = s => Buffer.from([...Buffer.from(s, 'utf8')].map((b, i) => b ^ KEY.charCodeAt(i % KEY.length) ^ (i * 7 & 255))).toString('base64');
const DECODER = `var _$=function(s){for(var b=atob(s),o=[],i=0;i<b.length;i++)o.push(b.charCodeAt(i)^${JSON.stringify(KEY)}.charCodeAt(i%${KEY.length})^(i*7&255));return new TextDecoder().decode(new Uint8Array(o))};\n`;

let html = read('index.html');
const scripts = [...html.matchAll(/<script src="([^"?]+)[^"]*"><\/script>/g)].map(m => m[1]);
const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const styles = [...html.matchAll(/<link rel="stylesheet" href="([^"?]+)[^"]*">/g)].map(m => m[1]);

/* ---------- JavaScript ---------- */
let js = scripts.map(read).concat(inline).join(';\n');
const hits = [];
walk(parse(js, { ecmaVersion: 'latest', sourceType: 'script' }), {
  Literal(n) { if (typeof n.value === 'string' && n.value.includes('{CTF}')) hits.push(n); },
  TemplateLiteral(n) { if (n.quasis.some(q => q.value.cooked.includes('{CTF}'))) throw new Error('Put flags in plain quoted strings, not template literals'); }
});
for (const n of hits.sort((a, b) => b.start - a.start)) js = js.slice(0, n.start) + `_$(${JSON.stringify(encode(n.value))})` + js.slice(n.end);
const min = await minify(DECODER + js, { compress: { passes: 2 }, mangle: true, format: { comments: false } });
const appJs = min.code;

/* ---------- CSS ---------- */
const appCss = styles.map(read).join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/url\(\.\.\//g, 'url(')        // stylesheets move from css/ to the site root
  .replace(/\n+/g, '');

/* ---------- HTML ---------- */
html = html
  .replace(/<link rel="stylesheet"[^>]*>\s*/g, '')
  .replace(/<script[\s\S]*?<\/script>\s*/g, '')
  .replace('</head>', `<link rel="stylesheet" href="app.css?v=${hash(appCss)}"></head>`)
  .replace('</body>', `<script src="app.js?v=${hash(appJs)}"></script></body>`)
  .replace(/<!--(?!!)[\s\S]*?-->/g, '')       // comments are dropped, except <!--! ... --> (the source-viewer honeypot)
  .replace(/<!--!/g, '<!--')
  .replace(/>\s+</g, '><')
  .trim() + '\n';

/* ---------- write dist/ ---------- */
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
writeFileSync(join(out, 'index.html'), html);
writeFileSync(join(out, 'app.js'), appJs);
writeFileSync(join(out, 'app.css'), appCss);
for (const d of ['img', 'video', 'robots.txt', 'flag-backup']) cpSync(join(root, d), join(out, d), { recursive: true });

// Safety check: nothing in dist/ may contain a readable flag
const files = d => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? files(join(d, f)) : [join(d, f)]);
const leaks = files(out).filter(f => /\.(html|js|css|txt)$/.test(f) && /\{CTF\}|CTF\}\[|REPLACE-ME|L0VE|SN4CK-1337/.test(HONEYPOTS.reduce((t, h) => t.split(h).join(''), readFileSync(f, 'utf8'))));
if (leaks.length) { console.error('Flag text found in:', leaks); process.exit(1); }
console.log(`dist/ built: ${hits.length} flag strings encoded, app.js ${(appJs.length / 1024).toFixed(0)} KB, app.css ${(appCss.length / 1024).toFixed(0)} KB, ${scripts.length} scripts bundled`);
