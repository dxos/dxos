//
// Copyright 2024 DXOS.org
//

import { createContext, useContext, useMemo } from 'react';

import { raise } from '@dxos/debug';
import { nonNullable } from '@dxos/util';

import { type Plugin, type PluginMeta } from './plugin';
import { findPlugin, resolvePlugin } from '../helpers';

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
   * NOTE: This is metadata rather than just ids because it includes plugins which have not been fully loaded yet.
   */
  available: PluginMeta[];

  /**
   * Mark plugin as enabled.
   * Requires reload to take effect.
   */
  // TODO(burdon): Functions should not be part of the settings type.
  setPlugin: (id: string, enabled: boolean) => void;
};

const PluginContext = createContext<PluginContext | undefined>(undefined);

/**
 * Get all plugins.
 */
export const usePlugins = (): PluginContext => useContext(PluginContext) ?? raise(new Error('Missing PluginContext'));

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

export const PluginProvider = PluginContext.Provider;
