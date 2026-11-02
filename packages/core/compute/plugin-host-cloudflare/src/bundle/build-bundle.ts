//
// Copyright 2026 DXOS.org
//

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PluginLoader } from '@dxos/edge-compute/plugin-loader';

/** Where a plugin package's bundle is built, relative to the package. */
export const BUNDLE_DIR = 'dist/plugin';

/** This package's main module, built beside this chunk: the host EDGE starts a plugin with. */
const hostEntry = (): string => {
  const modulePath = fileURLToPath(import.meta.url);
  // From source in tests and tools, from the build beside this chunk otherwise.
  return modulePath.endsWith('.ts')
    ? join(dirname(modulePath), '..', 'index.ts')
    : join(dirname(modulePath), 'index.mjs');
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
