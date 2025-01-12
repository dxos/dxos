//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type PluginManager } from '../core';

const PluginManagerContext = createContext<PluginManager | undefined>(undefined);

/**
 *
 */
export const usePluginManager = (): PluginManager =>
  useContext(PluginManagerContext) ?? raise(new Error('Missing PluginManagerContext'));

/**
 *
 */
export const PluginManagerProvider = PluginManagerContext.Provider;
