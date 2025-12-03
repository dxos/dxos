import { build } from 'esbuild';
import path from 'path';
import fs from 'node:fs/promises';

const PACKAGES = [
  // packages to vendor
  'effect',
  '@effect/platform',

  '@dxos/echo',
  '@dxos/functions',
  '@dxos/functions-runtime-cloudflare',
];

const IGNORED = [
  // ignored entry points
  'effect/.index',
  'effect/package.json',
  '@effect/platform/package.json',
];

const entryPoints = Object.fromEntries(
  (await Promise.all(PACKAGES.map((pkg) => resolveExports(pkg))))
    .flat()
    .filter((pkg) => !IGNORED.includes(pkg))
    .map((pkg) => [pkg, pkg]),
);

console.log(entryPoints);

try {
  await fs.rm('./dist/vendor', { recursive: true });
} catch {}

await build({
  entryPoints,
  bundle: true,
  splitting: true,
  format: 'esm',
  platform: 'browser',
  conditions: ['workerd', 'worker', 'browser'],
  metafile: true,
  loader: {
    '.wasm': 'copy',
  },
  outdir: './dist/vendor',
  chunkNames: 'internal/[name]-[hash]',
  assetNames: 'internal/[name]-[hash]',
});

/**
 * Resolves all export specifiers for a package.
 *
 * @example effect -> effect, effect/Array, effect/Effect, effect/Schema, effect/Schedule, etc..
 */
async function resolveExports(pkg) {
  let currentDir = process.cwd();
  const root = '/';

  while (currentDir !== root) {
    const packageJsonPath = `${currentDir}/node_modules/${pkg}/package.json`;
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      const exports = packageJson.exports || {};

      if (typeof exports === 'string') {
        return [pkg];
      }

      const specifiers = [];

      // Check if package has a "." export
      const hasDefaultExport = exports['.'] !== undefined;
      if (hasDefaultExport) {
        specifiers.push(pkg);
      }
      for (const [key, value] of Object.entries(exports)) {
        if (key !== '.' && !key.startsWith('./')) {
          continue;
        }
        if (key === '.') {
          continue;
        }
        specifiers.push(`${pkg}/${key.slice(2)}`);
      }

      return specifiers;
    } catch (err) {
      currentDir = path.dirname(currentDir);
      continue;
    }
  }

  return [pkg];
}
