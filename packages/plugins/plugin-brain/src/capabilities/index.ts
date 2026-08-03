//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { InboxCapabilities, InboxEvents } from '@dxos/plugin-inbox/types';
import { ProjectCapabilities, ProjectsEvents } from '@dxos/plugin-projects/types';

import { BrainCapabilities } from '#types';

export * from './fact-store';

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const FactStore = Capability.lazyModule(
  'FactStore',
  { provides: [BrainCapabilities.FactStoreRegistry, Capabilities.LayerSpec] },
  () => import('./fact-store'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.plugin.brain.surface.facts'],
});
export const Settings = AppCapability.settings(() => import('./settings'), {
  provides: [BrainCapabilities.Settings],
});
export const MailboxAction = Capability.lazyModule(
  'MailboxAction',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [InboxCapabilities.MailboxAction],
    activatesOn: InboxEvents.Start,
  },
  () => import('./mailbox-action'),
);
export const ProjectTemplates = Capability.lazyModule(
  'ProjectTemplates',
  { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
  () => import('./project-templates'),
);
