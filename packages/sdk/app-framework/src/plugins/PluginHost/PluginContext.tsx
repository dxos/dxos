//
// Copyright 2023 DXOS.org
//

import { type Context, type Provider, createContext, useContext } from 'react';

import { type Plugin } from './plugin';
import { findPlugin, resolvePlugin } from '../helpers';

export type PluginContext = {
  /**
   * All plugins are ready.
   */
  ready: boolean;

  /**
   * Ids of plugins which are enabled on this device.
   */
  enabled: string[];

  /**
   * Initialized and ready plugins.
   */
  plugins: Plugin[];

  /**
   * All available plugins.
   */
  available: Plugin['meta'][];

  /**
   * Mark plugin as enabled.
   *
   * Requires reload to take effect.
   */
  enablePlugin: (id: string) => void;

  /**
   * Mark plugin as disabled.
   *
   * Requires reload to take effect.
   */
  disablePlugin: (id: string) => void;
};

const PluginContext: Context<PluginContext> = createContext<PluginContext>({
  ready: false,
  enabled: [],
  plugins: [],
  available: [],
  enablePlugin: () => {},
  disablePlugin: () => {},
});

/**
 * Get all plugins.
 */
export const usePlugins = (): PluginContext => useContext(PluginContext);

/**
 * Get a plugin by ID.
 */
export const usePlugin = <T,>(id: string): Plugin<T> | undefined => {
  const { plugins } = usePlugins();
  return findPlugin<T>(plugins, id);
};

/**
 * Resolve a plugin by predicate.
 */
export const useResolvePlugin = <T,>(predicate: (plugin: Plugin) => Plugin<T> | undefined): Plugin<T> | undefined => {
  const { plugins } = usePlugins();
  return resolvePlugin(plugins, predicate);
};

export const PluginProvider: Provider<PluginContext> = PluginContext.Provider;
