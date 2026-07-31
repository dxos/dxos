//
// Copyright 2025 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
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
