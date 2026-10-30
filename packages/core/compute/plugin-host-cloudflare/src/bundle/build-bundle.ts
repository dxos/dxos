//
// Copyright 2026 DXOS.org
//

import { readFile, realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import * as PluginBundle from './PluginBundle.ts';

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
 * `<package>/dist/plugin`, with the EDGE plugin host added to `vendor/`. Returns the bundle directory.
 */
export const buildBundle = async (packageDir: string): Promise<string> => {
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
        vendor: { extra: [{ specifier: PluginBundle.HOST_SPECIFIER, importers: [], path: hostEntry() }] },
      }),
      build: { outDir: BUNDLE_DIR, emptyOutDir: true },
    });
  } finally {
    process.chdir(cwd);
  }
  return join(packageDir, BUNDLE_DIR);
};

const readPackage = async (dir: string): Promise<{ dependencies?: Record<string, string> }> =>
  JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'));

const pluginKeyOf = async (bundleDir: string): Promise<{ key: string; dependsOn: readonly string[] }> => {
  const manifest: { key: string; dependsOn?: string[] } = JSON.parse(
    await readFile(join(bundleDir, PluginBundle.MANIFEST_FILE), 'utf8'),
  );
  return { key: manifest.key, dependsOn: manifest.dependsOn ?? [] };
};

/**
 * Builds the bundles of the plugins in a plugin package's `dependsOn` closure, found among its `@dxos/plugin-*`
 * dependencies (transitively), and returns their directories. A plugin activates only with its dependencies, and on
 * EDGE they are separate bundles the loader places beside it.
 */
export const buildDependencyBundles = async (packageDir: string, primaryBundle: string): Promise<string[]> => {
  const needed = new Set((await pluginKeyOf(primaryBundle)).dependsOn);
  const visited = new Set([await realpath(packageDir)]);
  const queue = [packageDir];
  const bundles: string[] = [];
  for (let dir = queue.shift(); needed.size > 0 && dir !== undefined; dir = queue.shift()) {
    for (const name of Object.keys((await readPackage(dir)).dependencies ?? {}).filter((name) =>
      name.startsWith('@dxos/plugin-'),
    )) {
      // Through `node_modules` rather than `require.resolve`: plugin packages do not export `./package.json`.
      const dependencyDir = await realpath(join(dir, 'node_modules', name));
      if (visited.has(dependencyDir)) {
        continue;
      }
      visited.add(dependencyDir);
      queue.push(dependencyDir);
      try {
        await readFile(join(dependencyDir, 'dx.config.ts'));
      } catch {
        continue;
      }
      const bundle = await buildBundle(dependencyDir);
      const { key, dependsOn } = await pluginKeyOf(bundle);
      if (needed.has(key)) {
        needed.delete(key);
        dependsOn.forEach((dependency) => needed.add(dependency));
        bundles.push(bundle);
      }
    }
  }
  if (needed.size > 0) {
    throw new Error(`No @dxos/plugin-* dependency of ${packageDir} provides ${[...needed].join(', ')}.`);
  }
  return bundles;
};
