/**
 * Build standalone Tailwind CSS v4 for the consulting static site.
 *
 * Output: consulting/css/styles.css (overwrites existing)
 *         consulting/build-info.json -> { "css_version": "2026-09-04T15:12:00Z", "build_id": "abc123" }
 *
 * HTML pages reference this version via a `<meta name="build-id">` tag,
 * which the service worker uses for cache invalidation and which
 * `js/cache-bust.js` reads to append `?v=<build_id>` to CSS/JS URLs.
 *
 * Usage:
 *   node scripts/build-consulting-css.mjs           # production build
 *   node scripts/build-consulting-css.mjs --watch   # watch mode
 */
import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const input = resolve(root, 'consulting/src/input.css');
const output = resolve(root, 'consulting/css/styles.css');
const buildInfoPath = resolve(root, 'consulting/build-info.json');
const watch = process.argv.includes('--watch');

mkdirSync(dirname(input), { recursive: true });
mkdirSync(dirname(output), { recursive: true });

console.log(`Building CSS: ${input} → ${output}`);
console.log(`Mode: ${watch ? 'watch' : 'production (minified)'}`);
try {
  execSync(
    `npx @tailwindcss/cli -i "${input}" -o "${output}" ${watch ? '' : '--minify'}`,
    { stdio: 'inherit', cwd: root }
  );
} catch (err) {
  console.error('CSS build failed:', err.message);
  process.exit(1);
}

// Compute content hash for cache busting
const cssBytes = readFileSync(output);
const buildId = createHash('sha256').update(cssBytes).digest('hex').slice(0, 12);
const buildInfo = {
  build_id: buildId,
  built_at: new Date().toISOString(),
  css_bytes: cssBytes.length,
};
writeFileSync(buildInfoPath, JSON.stringify(buildInfo, null, 2));

console.log(`✓ CSS built: styles.css (${cssBytes.length} bytes)`);
console.log(`✓ Build info: build-info.json (id=${buildId})`);

// Inject build ID into all HTML <meta name="build-id"> so cache-bust.js can read it
const dir = resolve(root, 'consulting');
const htmlFiles = readdirSync(dir).filter((f) => f.endsWith('.html'));
let updated = 0;
for (const f of htmlFiles) {
  const p = join(dir, f);
  let c = readFileSync(p, 'utf8');
  const tag = `<meta name="build-id" content="${buildId}">`;
  if (c.includes('name="build-id"')) {
    c = c.replace(/<meta name="build-id" content="[^"]*">/g, tag);
  } else if (c.includes('rel="manifest"')) {
    c = c.replace(/(    <link rel="manifest")/, `${tag}\n$1`);
  } else {
    c = c.replace(/(    <\/head>)/, `${tag}\n$1`);
  }
  writeFileSync(p, c);
  updated++;
}
console.log(`✓ Injected build-id meta into ${updated} HTML files`);
