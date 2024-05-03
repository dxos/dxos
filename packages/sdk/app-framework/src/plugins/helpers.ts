//
// Copyright 2023 DXOS.org
//

import { raise } from '@dxos/debug';

import { type Plugin } from './PluginHost';

/**
 * Define a plugin
 */
export const definePlugin = <TProvides>(plugin: Plugin<TProvides>): Plugin<TProvides> => plugin;

/**
 * Find a plugin by ID.
 */
export const findPlugin = <T>(plugins: Plugin[], id: string): Plugin<T> | undefined => {
  return plugins.find(
    (plugin) => plugin.meta.id === id || (typeof plugin.meta.shortId === 'string' && plugin.meta.shortId === id),
  ) as Plugin<T>;
};

/**
 * Find a plugin by ID, or raise an error if not found.
 */
export const getPlugin = <T>(plugins: Plugin[], id: string): Plugin<T> => {
  return findPlugin(plugins, id) ?? raise(new Error(`Plugin not found: ${id}`));
};

/**
 * Filter a list of plugins to only those that match a predicate.
 */
export const filterPlugins = <T>(
  plugins: Plugin[],
  predicate: (plugin: Plugin) => Plugin<T> | undefined,
): Plugin<T>[] => plugins.map((plugin) => predicate(plugin)).filter((plugin): plugin is Plugin<T> => !!plugin);

/**
 * Resolves a plugin by predicate.
 *
 * @example
 * import { parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
 * const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
 */
export const resolvePlugin = <T>(
  plugins: Plugin[],
  predicate: (plugin: Plugin) => Plugin<T> | undefined,
): Plugin<T> | undefined => filterPlugins(plugins, predicate)[0];
