//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import * as RoutineCapabilities from '../types/RoutineCapabilities';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const Commands = AppCapability.commands(() => import('./commands'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const LayerSpecs = AppCapability.layerSpec(() => import('./layer-specs'), {
  name: 'LayerSpecs',
  provides: [Capabilities.TraceSink],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.cardContent'],
});
export const RegistrySync = Capability.lazyModule(
  'RegistrySync',
  {
    requires: [
      ClientCapabilities.Client,
      Capabilities.AtomRegistry,
      AppCapabilities.SkillDefinition,
      Capabilities.OperationHandler,
    ],
    provides: [],
  },
  () => import('./registry-sync'),
);
export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [RoutineCapabilities.Template] },
  () => import('./templates'),
);
export const TriggerRuntimeController = Capability.lazyModule(
  'TriggerRuntimeController',
  {
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [],
    // Runtime event: triggers only need to react to spaces once the client observes them.
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./trigger-runtime-controller'),
);
