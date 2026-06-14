//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

import { DXN } from '@dxos/keys';

import { Plugin } from '../core';

import { type BuildMeta } from './manifest';

/**
 * Plugin metadata as authored in `dx.yml` under `package.plugins[]`. Mirrors the
 * self-declared subset of `Plugin.Meta` minus the derived `id`/`version` (here
 * `id` is the authored NSID from which `key = DXN.make(id)` is built). Provenance
 * (`author`) is intentionally absent — it is resolved at runtime, not authored.
 *
 * NOTE: kept byte-identical to the dx-compile copy (`tools/dx-compile/src/plugin-meta.ts`).
 * The two toolchains can't share a module without a build-order cycle, so the
 * small parse/synthesize logic is duplicated.
 */
export type PluginMetaEntry = {
  id: string;
  name: string;
  description?: string;
  homePage?: string;
  source?: string;
  spec?: string;
  screenshots?: (string | { light?: string; dark?: string })[];
  icon?: string;
  iconHue?: string;
  tags?: string[];
  dependsOn?: string[];
};

/**
 * Reads the first plugin entry from a package's `dx.yml`. Returns `undefined`
 * when the package has no `dx.yml` or declares no plugins.
 */
export const readPluginMetaEntry = (packageDir: string): PluginMetaEntry | undefined => {
  const dxYmlPath = join(packageDir, 'dx.yml');
  if (!existsSync(dxYmlPath)) {
    return undefined;
  }
  const doc = parse(readFileSync(dxYmlPath, 'utf-8')) as { package?: { plugins?: PluginMetaEntry[] } };
  const plugins = doc?.package?.plugins;
  if (!Array.isArray(plugins) || plugins.length === 0) {
    return undefined;
  }
  const plugin = plugins[0];
  if (!plugin?.id || !plugin?.name) {
    throw new Error(`dx.yml plugin entry must declare 'id' and 'name': ${dxYmlPath}`);
  }
  return plugin;
};

// Self-declared Plugin.Meta fields authored in dx.yml. Excludes `id` (→ key) and
// build/publish orchestration, so neither leaks into the runtime meta / manifest.
const META_KEYS = [
  'name',
  'description',
  'homePage',
  'source',
  'spec',
  'screenshots',
  'icon',
  'iconHue',
  'tags',
  'dependsOn',
] as const;

const pickMetaFields = (plugin: PluginMetaEntry): Omit<PluginMetaEntry, 'id'> => {
  const out: Record<string, unknown> = {};
  for (const key of META_KEYS) {
    if (plugin[key] !== undefined) {
      out[key] = plugin[key];
    }
  }
  return out as Omit<PluginMetaEntry, 'id'>;
};

/**
 * Synthesizes the `#meta` module source from a plugin entry, identical to the
 * dx-compile esbuild adapter so dev/bundle (vite) and lib (esbuild) builds agree.
 */
export const synthesizePluginMetaSource = (plugin: PluginMetaEntry): string => {
  const fields = Object.entries(pickMetaFields(plugin))
    .map(([key, value]) => `  ${key}: ${JSON.stringify(value)},`)
    .join('\n');
  return [
    "import { Plugin } from '@dxos/app-framework';",
    "import { DXN } from '@dxos/keys';",
    '',
    'export const meta = Plugin.makeMeta({',
    `  key: DXN.make(${JSON.stringify(plugin.id)}),`,
    fields,
    '});',
    '',
  ].join('\n');
};

/**
 * Builds the {@link BuildMeta} used for manifest emission from a dx.yml plugin
 * entry, injecting the build-time `version` (from the package's `package.json`)
 * and an optional resolved `dependencies` snapshot.
 */
export const toBuildMeta = (
  plugin: PluginMetaEntry,
  version: string,
  dependencies?: Record<string, string>,
): BuildMeta => ({
  ...Plugin.makeMeta({ key: DXN.make(plugin.id, version), ...pickMetaFields(plugin) }),
  version,
  ...(dependencies ? { dependencies } : {}),
});
