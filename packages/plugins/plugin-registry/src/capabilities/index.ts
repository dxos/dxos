//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { RegistryCapabilities } from '../types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const DevPluginLoader = Capability.lazyModule(
  'DevPluginLoader',
  { requires: [Capabilities.PluginManager, Capabilities.AtomRegistry, RegistryCapabilities.Settings], provides: [] },
  () => import('./dev-plugin-loader'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog'],
});
export const RegistrySettings = AppCapability.settings(() => import('./settings'), {
  provides: [RegistryCapabilities.Settings],
});
