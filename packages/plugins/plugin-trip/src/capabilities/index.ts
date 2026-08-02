//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { MapCapabilities, MapEvents } from '@dxos/plugin-map/types';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { TripEvents } from '#types';

import skillDefinition from './skill-definition';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AttentionCapabilities.ViewState],
  activatesOn: TripEvents.Start,
});
export const SkillDefinition = Capability.inlineModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  skillDefinition,
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const MarkerProvider = Capability.lazyModule(
  'MarkerProvider',
  { provides: [MapCapabilities.MarkerProvider], activatesOn: MapEvents.Start },
  () => import('./marker-provider'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: TripEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const Settings = AppCapability.settings(() => import('./settings'), {
  requires: [Capabilities.AtomRegistry],
  activatesOn: TripEvents.Start,
});
