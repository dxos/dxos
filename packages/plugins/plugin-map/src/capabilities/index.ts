//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { SpaceCapability } from '@dxos/plugin-space';

import { MapCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [MapCapabilities.MarkerProvider],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const MarkerProvider = Capability.lazyModule(
  'MarkerProvider',
  { provides: [MapCapabilities.MarkerProvider], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./marker-provider'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const MapSettings = AppCapability.settings(() => import('./settings'), {
  provides: [MapCapabilities.Settings],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const MapState = Capability.lazyModule(
  'MapState',
  { provides: [MapCapabilities.State], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./state'),
);
