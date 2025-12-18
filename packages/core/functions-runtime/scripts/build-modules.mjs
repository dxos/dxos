import { build } from 'esbuild';
import path from 'path';
import fs from 'node:fs/promises';

const PACKAGES = [
  // packages to vendor
  'effect',
  '@effect/platform',
  '@automerge/automerge',
  'chess.js',

  '@dxos/echo',
  '@dxos/functions',
  '@dxos/functions-runtime-cloudflare',
  '@dxos/ai',
  '@dxos/assistant',
  '@dxos/echo-db',
  '@dxos/echo',
  '@dxos/log',
  '@dxos/plugin-chess',
  // Note: Causes circular dependency, if you will leave it in package.json.
  '@dxos/plugin-markdown',
  '@dxos/schema',
  '@dxos/types',
  '@dxos/util',
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
  logLevel: 'error',
  plugins: [rawImportPlugin()],
  loader: {
    '.css': 'empty',
    '.pcss': 'empty',
    '.scss': 'empty',
    '.sass': 'empty',
    '.wasm': 'copy',
  },
  outdir: './dist/vendor',
  chunkNames: 'internal/[name]-[hash]',
  assetNames: 'internal/[name]-[hash]',
});

function rawImportPlugin() {
  return {
    name: 'raw-import',
    setup(build) {
      build.onResolve({ filter: /\?raw$/ }, async (args) => {
        const pathWithoutQuery = args.path.replace(/\?raw$/, '');
        const resolved = await build.resolve(pathWithoutQuery, {
          importer: args.importer,
          kind: args.kind,
          resolveDir: args.resolveDir,
        });

        if (resolved.errors.length > 0) {
          return { errors: resolved.errors };
        }

        return {
          path: resolved.path,
          namespace: 'raw-import',
        };
      });

      build.onLoad({ filter: /.*/, namespace: 'raw-import' }, async (args) => {
        const contents = await fs.readFile(args.path, 'utf-8');
        return {
          contents: `export default ${JSON.stringify(contents)};`,
          loader: 'js',
        };
      });
    },
  };
}

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
      const exportsField = packageJson.exports;
      if (exportsField === undefined) {
        return [pkg];
      }

      const exports = exportsField || {};

      if (typeof exports === 'string') {
        return [pkg];
      }

      if (exports && typeof exports === 'object' && Object.keys(exports).length === 0) {
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
