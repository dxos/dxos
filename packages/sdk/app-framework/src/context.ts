//
// Copyright 2025 DXOS.org
//

import { createContext } from '@dxos/web-context-react';

import { type PluginManager } from './core';

export const PluginManagerContext = createContext<PluginManager>('dxos.org/app-framework/plugin-manager');
