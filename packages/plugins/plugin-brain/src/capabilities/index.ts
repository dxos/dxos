//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { InboxCapabilities } from '@dxos/plugin-inbox/types';
import { ProjectCapabilities } from '@dxos/plugin-projects/types';

import { BrainCapabilities } from '#types';

export * from './fact-store';

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));
export const FactStore = Capability.lazyModule(
  'FactStore',
  { provides: [BrainCapabilities.FactStoreRegistry, Capabilities.LayerSpec] },
  () => import('./fact-store'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const Settings = AppCapability.settings(() => import('./settings'), {
  provides: [BrainCapabilities.Settings],
  activatesOn: ActivationEvents.DeferredStartup,
});
export const MailboxAction = Capability.lazyModule(
  'MailboxAction',
  {
    requires: [Capabilities.AtomRegistry],
    provides: [InboxCapabilities.MailboxAction],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./mailbox-action'),
);
export const ProjectTemplates = Capability.lazyModule(
  'ProjectTemplates',
  { provides: [ProjectCapabilities.Template], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./project-templates'),
);
