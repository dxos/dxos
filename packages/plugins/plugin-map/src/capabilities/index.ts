//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { MapCapabilities, MapEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [MapCapabilities.MarkerProvider],
  activatesOn: MapEvents.Start,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const MarkerProvider = Capability.lazyModule(
  'MarkerProvider',
  { provides: [MapCapabilities.MarkerProvider], activatesOn: MapEvents.Start },
  () => import('./marker-provider'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: MapEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: MapEvents.Start,
});
export const MapSettings = AppCapability.settings(() => import('./settings'), {
  provides: [MapCapabilities.Settings],
  activatesOn: MapEvents.Start,
});
export const MapState = Capability.lazyModule(
  'MapState',
  { provides: [MapCapabilities.State], activatesOn: MapEvents.Start },
  () => import('./state'),
);
