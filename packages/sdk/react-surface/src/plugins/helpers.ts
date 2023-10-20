//
// Copyright 2023 DXOS.org
//

import { raise } from '@dxos/debug';

import { type Plugin } from './PluginHost';

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
export const filterPlugins = <T>(plugins: Plugin[], predicate: (plugin: Plugin<T>) => boolean): Plugin<T>[] =>
  (plugins as Plugin<T>[]).filter((plugin) => predicate(plugin));
