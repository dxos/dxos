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
export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  environments: [],
});
// Browser-only: the entry supplies `CreateProjectPanel`, the React form that picks the project
// template and collects its name.
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: [],
});
export const NavigationTargetResolver = AppCapability.navigationResolver(() => import('./navigation-target-resolver'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const SubjectContext = Capability.lazyModule(
  'SubjectContext',
  { provides: [AssistantCapabilities.SubjectContext], activatesOn: AssistantEvents.Start },
  () => import('./subject-context'),
);
export const TaskAction = Capability.lazyModule(
  'TaskAction',
  // Rides the tasks feature it contributes to: the entry is unreachable until a task list renders.
  { provides: [TasksCapabilities.TaskAction], activatesOn: TasksEvents.Start },
  () => import('./task-action'),
);
export const Templates = Capability.lazyModule(
  'Templates',
  {
    provides: [ProjectCapabilities.Template],
    activatesOn: ProjectsEvents.Start,
  },
  () => import('./templates'),
);
export const SampleSpaces = AppCapability.sampleSpaces(() => import('./sample-spaces'));

export const Translations = AppCapability.translations(translations);
