//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type PluginManager } from '../core';

const PluginManagerContext = createContext<PluginManager.PluginManager | undefined>(undefined);

/**
 * Get the plugin manager.
 */
export const usePluginManager = (): PluginManager.PluginManager =>
  useContext(PluginManagerContext) ?? raise(new Error('Missing PluginManagerContext'));

/**
 * Context provider for a plugin manager.
 */
export const PluginManagerProvider = PluginManagerContext.Provider;
