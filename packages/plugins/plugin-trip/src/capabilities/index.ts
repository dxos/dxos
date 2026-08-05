//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { MapCapabilities } from '@dxos/plugin-map/types';
import { SpaceCapability } from '@dxos/plugin-space';

import skillDefinition from './skill-definition';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AttentionCapabilities.ViewState],
});
export const SkillDefinition = Capability.inlineModule(
  'SkillDefinition',
  { provides: [AppCapabilities.SkillDefinition] },
  skillDefinition,
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const MarkerProvider = Capability.lazyModule(
  'MarkerProvider',
  { provides: [MapCapabilities.MarkerProvider] },
  () => import('./marker-provider'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const Settings = AppCapability.settings(() => import('./settings'), {
  requires: [Capabilities.AtomRegistry],
});
