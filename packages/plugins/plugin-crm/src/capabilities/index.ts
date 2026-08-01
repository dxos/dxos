//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ProjectCapabilities } from '@dxos/plugin-projects/types';
import { RoutineCapabilities } from '@dxos/plugin-routine';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ActivationEvents.DeferredStartup,
});

export const AutomationTemplates = Capability.lazyModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./automation-templates'),
);

export const ProjectTemplates = Capability.lazyModule(
  'ProjectTemplates',
  { provides: [ProjectCapabilities.Template], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./project-templates'),
);

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
