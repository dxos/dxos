//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type PluginManager } from '../../../core';

const PluginManagerContext = createContext<PluginManager.PluginManager | undefined>(undefined);

/**
 * Get the plugin manager.
 */
export const usePluginManager = (): PluginManager.PluginManager =>
  useContext(PluginManagerContext) ?? raise(new Error('Missing PluginManagerContext'));

/**
 * Get the plugin manager if present, or `undefined` when rendered outside a {@link PluginManagerProvider}
 * (e.g. a standalone component story). Lets components treat plugin capabilities as a progressive
 * enhancement rather than a hard requirement.
 */
export const useOptionalPluginManager = (): PluginManager.PluginManager | undefined => useContext(PluginManagerContext);

/**
 * Context provider for a plugin manager.
 */
export const PluginManagerProvider = PluginManagerContext.Provider;
