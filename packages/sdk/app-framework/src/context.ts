//
// Copyright 2025 DXOS.org
//

import { createContext } from '@dxos/web-context';

import { type PluginManager } from './core/index.ts';

export const PluginManagerContext = createContext<PluginManager.PluginManager>('org.dxos.app-framework.plugin-manager');
