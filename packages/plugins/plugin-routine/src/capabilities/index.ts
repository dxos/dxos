//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { SpaceCapability } from '@dxos/plugin-space';

import { RoutineCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const NavigationResolver = Capability.lazyModule(
  'NavigationResolver',
  { provides: [AppCapabilities.NavigationPathResolver] },
  () => import('./navigation-resolver'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const LayerSpecs = Capability.lazyModule(
  'LayerSpecs',
  { provides: [Capabilities.LayerSpec, Capabilities.TraceSink] },
  () => import('./layer-specs'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
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
