//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

import * as RoutineCapabilities from '../types/RoutineCapabilities';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  () => import('./app-graph-builder'),
);
export const LayerSpecs = Capability.lazyModule(
  'LayerSpecs',
  { provides: [Capabilities.LayerSpec, Capabilities.TraceSink] },
  () => import('./layer-specs'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
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
