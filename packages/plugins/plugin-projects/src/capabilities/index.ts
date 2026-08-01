//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { SpaceCapability } from '@dxos/plugin-space';

import { ProjectCapabilities, ProjectsEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ProjectsEvents.Start,
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ProjectsEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: ProjectsEvents.Start,
});
export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
  () => import('./templates'),
);
