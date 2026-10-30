//
// Copyright 2026 DXOS.org
//

import { existsSync } from 'node:fs';
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

const manifestOf = async (bundleDir: string): Promise<{ dependsOn?: string[] }> =>
  JSON.parse(await readFile(join(bundleDir, PluginBundle.MANIFEST_FILE), 'utf8'));

/** Every `@dxos/plugin-*` package with a `dx.config.ts` reachable through a package's dependencies. */
const pluginPackages = async (packageDir: string): Promise<string[]> => {
  const visited = new Set([await realpath(packageDir)]);
  const plugins: string[] = [];
  const queue = [packageDir];
  for (let dir = queue.shift(); dir !== undefined; dir = queue.shift()) {
    const names = Object.keys((await readPackage(dir)).dependencies ?? {}).filter((name) =>
      name.startsWith('@dxos/plugin-'),
    );
    for (const name of names) {
      // Through `node_modules` rather than `require.resolve`: plugin packages do not export `./package.json`.
      const dependencyDir = await realpath(join(dir, 'node_modules', name));
      if (!visited.has(dependencyDir)) {
        visited.add(dependencyDir);
        queue.push(dependencyDir);
        if (existsSync(join(dependencyDir, 'dx.config.ts'))) {
          plugins.push(dependencyDir);
        }
      }
    }
  }
  return plugins;
};

/**
 * Builds the bundles of the plugins in a plugin package's `dependsOn` closure, found among its `@dxos/plugin-*`
 * dependencies (transitively), and returns their directories. A plugin activates only with its dependencies, and on
 * EDGE they are separate bundles the loader places beside it. Only the closure is built; other packages are read for
 * their key alone.
 */
export const buildDependencyBundles = async (packageDir: string, primaryBundle: string): Promise<string[]> => {
  const { loadDxConfigWithVite } = await import('@dxos/app-framework/vite-plugin');
  const candidates = await pluginPackages(packageDir);
  const keys = new Map<string, string>();
  const keyOf = async (dir: string) => {
    const key = keys.get(dir) ?? (await loadDxConfigWithVite(join(dir, 'dx.config.ts'), dir)).plugin.key;
    keys.set(dir, key);
    return key;
  };
  const pending = [...((await manifestOf(primaryBundle)).dependsOn ?? [])];
  const built = new Map<string, string>();
  for (let key = pending.shift(); key !== undefined; key = pending.shift()) {
    if (built.has(key)) {
      continue;
    }
    let dir: string | undefined;
    for (const candidate of candidates) {
      if ((await keyOf(candidate)) === key) {
        dir = candidate;
        break;
      }
    }
    if (dir === undefined) {
      throw new Error(`No @dxos/plugin-* dependency of ${packageDir} provides ${key}.`);
    }
    const bundle = await buildBundle(dir);
    built.set(key, bundle);
    pending.push(...((await manifestOf(bundle)).dependsOn ?? []));
  }
  return [...built.values()];
};
