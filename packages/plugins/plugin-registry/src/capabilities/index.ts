//
// Copyright 2025 DXOS.org
//

import { ActivationEvent, ActivationEvents, Capabilities, Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { RegistryCapabilities } from '../types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const DevPluginLoader = Capability.lazyModule(
  'DevPluginLoader',
  { requires: [Capabilities.PluginManager, Capabilities.AtomRegistry, RegistryCapabilities.Settings], provides: [] },
  () => import('./dev-plugin-loader'),
);
// Also gated on the foreign namespace's demand event: this plugin handles settings-namespace operations,
// so the handler-set resolver's targeted pull reaches this module without a fallback flood.
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvent.oneOf(
    ActivationEvents.OwnOperationHandlersRequested,
    ActivationEvents.OperationHandlersRequested('org.dxos.plugin.settings'),
  ),
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.dialog'],
});
export const RegistrySettings = AppCapability.settings(() => import('./settings'), {
  provides: [RegistryCapabilities.Settings],
});
