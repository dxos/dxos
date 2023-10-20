//
// Copyright 2023 DXOS.org
//

import { createContext, useContext } from 'react';

import { type Plugin, type PluginDefinition } from './plugin';
import { findPlugin } from '../helpers';

export type PluginContext = {
  plugins: Plugin[];
  initializing: PluginDefinition[];
  loading: PluginDefinition[];
};

const PluginContext = createContext<PluginContext>({ plugins: [], initializing: [], loading: [] });

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

export const PluginProvider = PluginContext.Provider;
