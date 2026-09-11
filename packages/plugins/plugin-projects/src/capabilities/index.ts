//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantEvents from '@dxos/plugin-assistant/AssistantEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';
import * as TasksCapabilities from '@dxos/plugin-tasks/TasksCapabilities';
import * as TasksEvents from '@dxos/plugin-tasks/TasksEvents';

import { translations } from '#translations';
import { ProjectCapabilities, ProjectsEvents } from '#types';

// Narrower than the `appGraphBuilder` family default: the nodes it contributes carry
// `LayoutOperation` actions, which mean nothing without an app shell.
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'), {
  environments: [],
});
// Browser-only: the entry supplies `CreateProjectPanel`, the React form that picks the project
// template and collects its name.
export const CreateObject = SpaceCapability.createObject(() => import('./create-object.ts'), {
  environments: [],
});
export const NavigationTargetResolver = AppCapability.navigationResolver(
  () => import('./navigation-target-resolver.ts'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler.ts'), {
  activatesOn: ActivationEvents.Idle,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition.ts'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article'],
});
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const SubjectContext = Capability.lazyModule(
  'SubjectContext',
  { provides: [AssistantCapabilities.SubjectContext], activatesOn: AssistantEvents.Start },
  () => import('./subject-context.ts'),
);
export const TaskAction = Capability.lazyModule(
  'TaskAction',
  // Rides the tasks feature it contributes to: the entry is unreachable until a task list renders.
  { provides: [TasksCapabilities.TaskAction], activatesOn: TasksEvents.Start },
  () => import('./task-action.ts'),
);
export const Templates = Capability.lazyModule(
  'Templates',
  {
    provides: [ProjectCapabilities.Template],
    activatesOn: ProjectsEvents.Start,
  },
  () => import('./templates.ts'),
);

export const Translations = AppCapability.translations(translations);
