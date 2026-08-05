//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
import { InboxCapabilities } from '@dxos/plugin-inbox/types';
import { ProjectCapabilities } from '@dxos/plugin-projects/types';
import { RoutineCapabilities } from '@dxos/plugin-routine';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));

export const AutomationTemplates = Capability.lazyModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template] },
  () => import('./automation-templates'),
);

export const MailboxAction = Capability.lazyModule(
  'MailboxAction',
  { provides: [InboxCapabilities.MailboxAction] },
  () => import('./mailbox-action'),
);

export const ProjectTemplates = Capability.lazyModule(
  'ProjectTemplates',
  { provides: [ProjectCapabilities.Template] },
  () => import('./project-templates'),
);

export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
