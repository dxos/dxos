//
// Copyright 2024 DXOS.org
//

import { createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { type PluginManager } from './manager';

const PluginContext = createContext<PluginManager | undefined>(undefined);

export const usePluginHost = (): PluginManager =>
  useContext(PluginContext) ?? raise(new Error('Missing PluginContext'));

export const PluginProvider = PluginContext.Provider;
