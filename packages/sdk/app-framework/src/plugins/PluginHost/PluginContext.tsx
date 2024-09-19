//
// Copyright 2023 DXOS.org
//

import { type Context, type Provider, createContext, useContext, useMemo } from 'react';

import { type Plugin } from './plugin';
import { findPlugin, resolvePlugin } from '../helpers';
import { nonNullable } from '@dxos/util';

export type PluginContext = {
  /**
   * All plugins are ready.
   */
  ready: boolean;

  /**
   * Core plugins.
   */
  core: string[];

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
  // This is metadata rather then just ids because it includes plugins which have not been fully loaded yet.
  available: Plugin['meta'][];

  /**
   * Mark plugin as enabled.
   * Requires reload to take effect.
   */
  setPlugin: (id: string, enabled: boolean) => void;
};

const PluginContext: Context<PluginContext> = createContext<PluginContext>({
  ready: false,
  core: [],
  enabled: [],
  plugins: [],
  available: [],
  setPlugin: () => {},
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

/**
 * Resolve a collection of plugins by predicate.
 */
export const useResolvePlugins = <T,>(predicate: (plugin: Plugin) => Plugin<T> | undefined): Plugin<T>[] => {
  const { plugins } = usePlugins();
  return useMemo(() => plugins.map(predicate).filter(nonNullable), [plugins, predicate]);
};

export const PluginProvider: Provider<PluginContext> = PluginContext.Provider;
