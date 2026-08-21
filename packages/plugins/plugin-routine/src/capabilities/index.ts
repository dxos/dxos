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

import { RoutineCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  environments: ['node'],
});
export const Commands = AppCapability.commands(() => import('./commands'));
// The entry carries a live `customPanel` (`CreateRoutinePanel`) alongside the object factory, so the
// module cannot be evaluated without React.
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: [],
});
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
    environments: ['node'],
  },
  () => import('./registry-sync'),
);
export const Schema = AppCapability.schema(() => import('./schema'));
export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [RoutineCapabilities.Template], environments: ['node', 'workerd'] },
  () => import('./templates'),
);
export const TriggerRuntimeController = Capability.lazyModule(
  'TriggerRuntimeController',
  {
    requires: [ClientCapabilities.Client, Capabilities.ProcessManagerRuntime],
    provides: [],
    // Runtime event: triggers only need to react to spaces once the client observes them.
    activatesOn: ClientEvents.SpacesReady,
    environments: ['node'],
  },
  () => import('./trigger-runtime-controller'),
);
