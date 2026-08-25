//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as AssistantEvents from '@dxos/plugin-assistant/AssistantEvents';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { translations } from '#translations';
import { ProjectCapabilities, ProjectsEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'), {
  environments: ['workerd'],
});
// Browser-only: the entry supplies `CreateProjectPanel`, the React form that picks the project
// template and collects its name.
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: [],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
  environments: ['workerd'],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const Schema = AppCapability.schema(() => import('./schema'), {
  environments: ['workerd'],
});
export const SubjectContext = Capability.lazyModule(
  'SubjectContext',
  { provides: [AssistantCapabilities.SubjectContext], activatesOn: AssistantEvents.Start },
  () => import('./subject-context'),
);
export const Templates = Capability.lazyModule(
  'Templates',
  {
    provides: [ProjectCapabilities.Template],
    activatesOn: ProjectsEvents.Start,
    environments: ['workerd'],
  },
  () => import('./templates'),
);
export const Translations = AppCapability.translations(translations);
