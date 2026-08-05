//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { AttentionCapabilities } from '@dxos/plugin-attention';
import { RoutineCapabilities } from '@dxos/plugin-routine';
import { SpaceCapability } from '@dxos/plugin-space';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AttentionCapabilities.ViewState],
});
export const RoutineTemplates = Capability.lazyModule(
  'RoutineTemplates',
  { provides: [RoutineCapabilities.Template] },
  () => import('./routine-templates'),
);
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
