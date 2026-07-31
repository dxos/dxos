//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability } from '@dxos/app-toolkit';
import { SpaceCapability } from '@dxos/plugin-space';

import { CodeCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AppCapabilities.PluginAsset],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const BuildRunState = Capability.lazyModule(
  'BuildRunState',
  { provides: [CodeCapabilities.BuildRun] },
  () => import('./build-run-state'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const Settings = AppCapability.settings(() => import('./settings'));
