//
// Copyright 2023 DXOS.org
//

import { type Context, type Provider, createContext, useContext } from 'react';

import { type Plugin, type PluginDefinition } from './plugin';
import { findPlugin, resolvePlugin } from '../helpers';

export type PluginContext = {
  ready: boolean;
  initializing: PluginDefinition[];
  loading: PluginDefinition[];
  plugins: Plugin[];
};

const PluginContext: Context<PluginContext> = createContext<PluginContext>({
  ready: false,
  initializing: [],
  loading: [],
  plugins: [],
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
