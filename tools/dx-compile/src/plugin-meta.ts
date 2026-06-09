//
// Copyright 2026 DXOS.org
//

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

/**
 * Plugin metadata as authored in `dx.yml` under `package.plugins[]`. Mirrors the
 * app-framework `Plugin.Meta` shape minus the derived `id`/`version` (here `id`
 * is the authored NSID from which `key = DXN.make(id)` is built). The same shape
 * is consumed by the vite adapter so `#meta` resolves identically in dev.
 */
export type PluginMetaEntry = {
  id: string;
  name: string;
  author?: string;
  description?: string;
  homePage?: string;
  source?: string;
  spec?: string;
  screenshots?: string[];
  icon?: string;
  iconHue?: string;
  tags?: string[];
  dependsOn?: string[];
};

/**
 * Reads the first plugin entry from a package's `dx.yml`. Returns `undefined`
 * when the package has no `dx.yml` or declares no plugins — callers fall back to
 * the package's own `#meta` resolution (e.g. a legacy `src/meta.ts`).
 */
export const readPluginMeta = (packageDir: string): PluginMetaEntry | undefined => {
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

/**
 * Synthesizes the `#meta` module source from a plugin entry. Emits a
 * `Plugin.makeMeta({ key: DXN.make(id), ... })` so the runtime `meta` object is
 * identical to a hand-written `src/meta.ts` — `id`/`version` are derived from the
 * `key` by `makeMeta`, so the key carries no version (matching prior behavior).
 */
// Self-declared Plugin.Meta fields authored in dx.yml. Excludes `id` (→ key) and
// build/publish orchestration, so neither leaks into the synthesized meta.
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

export const synthesizePluginMetaSource = (plugin: PluginMetaEntry): string => {
  const { id } = plugin;
  const fields = META_KEYS.filter((key) => plugin[key] !== undefined)
    .map((key) => `  ${key}: ${JSON.stringify(plugin[key])},`)
    .join('\n');
  return [
    "import { Plugin } from '@dxos/app-framework';",
    "import { DXN } from '@dxos/keys';",
    '',
    'export const meta = Plugin.makeMeta({',
    `  key: DXN.make(${JSON.stringify(id)}),`,
    fields,
    '});',
    '',
  ].join('\n');
};
