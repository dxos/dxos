//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { CodeCapabilities, CodeEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [AppCapabilities.PluginAsset],
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const BuildRunState = Capability.lazyModule(
  'BuildRunState',
  { provides: [CodeCapabilities.BuildRun], activatesOn: CodeEvents.Start },
  () => import('./build-run-state'),
);
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.section'],
});
export const Settings = AppCapability.settings(() => import('./settings'), {
  activatesOn: ActivationEvents.Idle,
});
