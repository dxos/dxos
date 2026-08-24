//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import { log } from '@dxos/log';
import { PLUGIN_ENTRY_FILENAME } from '@dxos/protocols';

import { type PluginRecord, getPluginInstallPath } from '../storage';

/**
 * Absolute path of the module a record's plugin is imported from.
 *
 * A `link` record points into a directory the user owns, a `copy` record into the CLI's own
 * install directory. `entry` overrides the convention when the manifest named a different module.
 */
export const getEntryPath = (record: PluginRecord): string | undefined => {
  const entry = record.entry ?? PLUGIN_ENTRY_FILENAME;
  if (entry.startsWith('/')) {
    return entry;
  }
  switch (record.source?.kind) {
    case 'link':
      return `${record.source.path}/${entry}`;
    case 'copy':
      return `${getPluginInstallPath(record.id)}/${entry}`;
    default:
      return undefined;
  }
};

/**
 * Normalizes a plugin module's default export, which may be a `Plugin` or a factory for one.
 *
 * Mirrors the browser's `UrlLoader`: authors write `export default MyPlugin` where `MyPlugin` came
 * from `Plugin.make`, so the common case is a zero-arg factory rather than a plugin value.
 */
export const normalizePluginExport = (mod: Record<string, unknown>): Plugin.Plugin => {
  const exported = mod.default;
  if (Plugin.isPlugin(exported)) {
    return exported;
  }
  if (typeof exported === 'function') {
    const result = (exported as () => unknown)();
    if (Plugin.isPlugin(result)) {
      return result;
    }
  }
  throw new Error('Plugin module default export is not a Plugin or a zero-arg plugin factory.');
};

/**
 * Import failures recorded by {@link makeInstalledPlugin}, keyed by plugin id.
 *
 * Process-local: the load happens while the command tree is being built, so a command reading this
 * afterwards sees every failure from its own startup.
 */
const loadFailures = new Map<string, Error>();

/**
 * Builds a registrable plugin for an installed record **without importing its module**.
 *
 * The record cached the plugin's own metadata at install time, which is everything the manager
 * needs to catalog it — including `dependsOn`, so dependency resolution works on a plugin whose
 * code has never run. That makes `enable` the first moment third-party code executes, rather than
 * every `dx` invocation paying for every installed plugin.
 *
 * Returns `undefined` for a record the loader cannot place (no source, or no cached meta): the
 * caller records it as unavailable rather than failing, because one bad record must not take out
 * every command.
 */
export const makeInstalledPlugin = (record: PluginRecord): Plugin.Plugin | undefined => {
  const entryPath = getEntryPath(record);
  if (!record.meta || !entryPath) {
    log.warn('skipping unusable plugin record', { id: record.id, entryPath });
    return undefined;
  }

  const meta = Plugin.getMetaFromConfig({ plugin: record.meta });
  // `resolveLazy` requires the module's default export to be a factory, while authors may export
  // the plugin value itself; normalizing inside the loader keeps the browser's tolerance without
  // importing anything up front. A cached meta that has drifted from the module surfaces here as a
  // `meta-mismatch` LazyPluginError rather than as a silently wrong plugin.
  //
  // A failed import degrades to a plugin contributing nothing rather than propagating: the
  // manager resolves lazy plugins inside its initialization chain, so a throw here becomes a
  // `PluginInitializationError` that takes down every `dx` command — including the `plugin list`
  // and `plugin remove` the user needs to get out of it. The failure is recorded instead, and
  // `plugin list` reads it back.
  const loader: Plugin.LazyLoader<void> = () =>
    import(/* @vite-ignore */ entryPath).then(
      (mod) => ({ default: Object.assign(() => normalizePluginExport(mod), { meta }) }),
      (error) => {
        log.warn('plugin failed to load', { id: record.id, entryPath, error });
        loadFailures.set(record.id, error instanceof Error ? error : new Error(String(error)));
        return { default: Object.assign(() => Plugin.make(Plugin.define(meta))(), { meta }) };
      },
    );
  return Plugin.lazy(meta, loader)();
};

/** Returns the load failure for a plugin id, if its module could not be imported this run. */
export const getLoadFailure = (id: string): Error | undefined => loadFailures.get(id);

/**
 * Turns a profile's records into plugins the manager can register.
 *
 * Compiled-in plugins have no `source` and are skipped — the binary already supplies them.
 */
export const makeInstalledPlugins = (records: readonly PluginRecord[]): Plugin.Plugin[] =>
  records
    .filter((record) => record.source !== undefined)
    .map(makeInstalledPlugin)
    .filter((plugin): plugin is Plugin.Plugin => plugin !== undefined);
