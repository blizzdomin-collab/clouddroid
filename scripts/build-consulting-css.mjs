/**
 * Build standalone Tailwind CSS v4 for the consulting static site.
 *
 * Input:  consulting/src/input.css
 * Output: consulting/css/styles.css (overwrites existing)
 *
 * Usage:
 *   node scripts/build-consulting-css.mjs          # production build
 *   node scripts/build-consulting-css.mjs --watch # watch mode
 */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const input = resolve(root, 'consulting/src/input.css');
const output = resolve(root, 'consulting/css/styles.css');
const watch = process.argv.includes('--watch');

mkdirSync(dirname(input), { recursive: true });
mkdirSync(dirname(output), { recursive: true });

// Tailwind v4 standalone CLI (auto-downloads on first run)
const args = [
  '@tailwindcss/cli',
  '-i', input,
  '-o', output,
];
if (!watch) args.push('--minify');

console.log(`Building CSS: ${input} → ${output}`);
console.log(`Mode: ${watch ? 'watch' : 'production (minified)'}`);
try {
  execSync(`npx ${args.join(' ')}`, { stdio: 'inherit', cwd: root });
  if (!watch) console.log('✓ CSS built');
} catch (err) {
  console.error('CSS build failed:', err.message);
  process.exit(1);
}
