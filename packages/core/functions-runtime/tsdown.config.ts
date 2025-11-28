import path from 'path';
import fs from 'node:fs/promises';
import { defineConfig } from 'tsdown';

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

const processedEntryPoints: Record<string, string> = {};
for (const [key, value] of Object.entries(entryPoints)) {
  await fs.mkdir(path.dirname(`dist/entrypoints/${key}`), { recursive: true });
  await fs.writeFile(`dist/entrypoints/${key}.ts`, `export * from "${value}";`);
  processedEntryPoints[key] = `dist/entrypoints/${key}.ts`;
}

export default defineConfig({
  entry: processedEntryPoints,
  outDir: 'dist/vendor',
  noExternal: () => true,
  dts: {
    resolve: [
      //
      /@dxos/,
      /effect/,
      /^@effect/,
    ],
  },
  treeshake: true,
  outputOptions: {
    chunkFileNames: 'internal/[name]-[hash].js',
    assetFileNames: 'internal/[name]-[hash].[extname]',
    minifyInternalExports: false,
  },
});

/**
 * Resolves all export specifiers for a package.
 *
 * @example effect -> effect, effect/Array, effect/Effect, effect/Schema, effect/Schedule, etc..
 */
async function resolveExports(pkg: string): Promise<string[]> {
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
