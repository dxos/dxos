//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PluginLoader } from '@dxos/edge-compute/plugin-loader';
import { invariant } from '@dxos/invariant';

/** Where a plugin package's bundle is built, relative to the package. */
export const BUNDLE_DIR = 'dist/plugin';

/**
 * The entry of the `@dxos/plugin-host-cloudflare` this package installs: the host EDGE starts a plugin with. Its
 * `source` when this module runs from source in tests and tools, since the host's build may not exist then.
 */
const hostEntry = (): string => {
  const fromSource = fileURLToPath(import.meta.url).endsWith('.ts');
  for (let dir = dirname(fileURLToPath(import.meta.url)); ; dir = dirname(dir)) {
    const packageDir = join(dir, 'node_modules', PluginLoader.HOST_SPECIFIER);
    if (existsSync(join(packageDir, 'package.json'))) {
      const { exports } = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8'));
      const entry = exports?.['.']?.[fromSource ? 'source' : 'import'];
      invariant(typeof entry === 'string', `${PluginLoader.HOST_SPECIFIER} has no entry`);
      return join(packageDir, entry);
    }
    invariant(dirname(dir) !== dir, `${PluginLoader.HOST_SPECIFIER} is not installed`);
  }
};

/**
 * Builds a plugin package's one bundle with `composerPlugin`, the same build `dx registry publish` runs, into
 * `outDir` (default `<package>/dist/plugin`), with the EDGE plugin host added to `vendor/`. Returns the bundle
 * directory.
 */
export const buildBundle = async (packageDir: string, outDir = join(packageDir, BUNDLE_DIR)): Promise<string> => {
  const [{ build }, { composerPlugin }] = await Promise.all([
    import('vite'),
    import('@dxos/app-framework/vite-plugin'),
  ]);
  // `composerPlugin` finds the plugin's `dx.config.ts` from the working directory.
  const cwd = process.cwd();
  process.chdir(packageDir);
  try {
    await build({
      root: packageDir,
      configFile: false,
      logLevel: 'warn',
      plugins: composerPlugin({
        vendor: { extra: [{ specifier: PluginLoader.HOST_SPECIFIER, importers: [], path: hostEntry() }] },
      }),
      build: { outDir, emptyOutDir: true },
    });
  } finally {
    process.chdir(cwd);
  }
  return outDir;
};
