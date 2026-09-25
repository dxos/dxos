//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type PluginManager } from '../../../core/index.ts';

const PluginManagerContext = createContext<PluginManager.PluginManager | undefined>(undefined);

/**
 * Get the plugin manager.
 */
export const usePluginManager = (): PluginManager.PluginManager =>
  useContext(PluginManagerContext) ?? raise(new Error('Missing PluginManagerContext'));

/**
 * Get the plugin manager, or undefined outside a provider. Surfaces and activation signals fire
 * demand events opportunistically and must not throw when rendered standalone (stories, tests).
 */
export const useOptionalPluginManager = (): PluginManager.PluginManager | undefined => useContext(PluginManagerContext);

/**
 * Context provider for a plugin manager.
 */
export const PluginManagerProvider = PluginManagerContext.Provider;
