//
// Copyright 2023 DXOS.org
//

import { Context, type DisposeCallback } from '@dxos/context';
import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';

import { type Plugin, type PluginDefinition } from './plugin-host';

/**
 * Resolvers allow different instances of plugins to provide a particular capability.
 */
export type PluginResolver<T> = (plugin: Plugin) => Plugin<T> | undefined;

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
export const filterPlugins = <T>(plugins: Plugin[], predicate: PluginResolver<T>): Plugin<T>[] =>
  plugins.map((plugin) => predicate(plugin)).filter((plugin): plugin is Plugin<T> => !!plugin);

/**
 * Resolves a plugin by predicate.
 *
 * @example
 * import { parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
 * const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);
 */
export const resolvePlugin = <T>(plugins: Plugin[], predicate: PluginResolver<T>): Plugin<T> | undefined =>
  filterPlugins(plugins, predicate)[0];

class PluginContext {
  // TODO(burdon): Use Resource (@dima)?
  public readonly ctx = new Context();

  private _plugins?: Plugin[];

  init(plugins: Plugin[]) {
    this._plugins = plugins;
  }

  getPlugin<T>(id: string): Plugin<T> {
    invariant(this._plugins);
    return getPlugin(this._plugins, id);
  }

  resolvePlugin<T>(resolver: PluginResolver<T>): Plugin<T>;
  resolvePlugin<T>(resolver: PluginResolver<T>, required = false): Plugin<T> | undefined {
    invariant(this._plugins, 'context not initialized');
    const plugin = resolvePlugin(this._plugins, resolver);
    if (required && !plugin) {
      // TODO(burdon): Resolver should have a name.
      throw new Error('Plugin not found.');
    }

    return plugin;
  }

  onDispose(cb: DisposeCallback) {
    this.ctx.onDispose(cb);
  }

  dispose() {
    void this.ctx.dispose();
  }
}

/**
 * Plugin helper with dependency injection and life-cycle support.
 */
export const definePlugin = <Provides>(
  cb: (context: PluginContext) => PluginDefinition<Provides>,
): (() => PluginDefinition<Provides>) => {
  const context = new PluginContext();
  return () => cb(context);
};
