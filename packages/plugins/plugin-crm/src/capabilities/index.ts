//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as InboxCapabilities from '@dxos/plugin-inbox/InboxCapabilities';
import * as InboxEvents from '@dxos/plugin-inbox/InboxEvents';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';
import * as ProjectsEvents from '@dxos/plugin-projects/ProjectsEvents';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));

export const AutomationTemplates = Capability.lazyModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  () => import('./automation-templates'),
);

export const MailboxAction = Capability.lazyModule(
  'MailboxAction',
  // Rides the inbox feature it contributes to, exactly as the plugin-brain sibling does — the
  // action is unreachable until a mailbox renders.
  {
    requires: [ClientCapabilities.Client],
    provides: [InboxCapabilities.MailboxAction],
    activatesOn: InboxEvents.Start,
  },
  () => import('./mailbox-action'),
);

export const MailboxProcessor = Capability.lazyModule(
  'MailboxProcessor',
  { provides: [InboxCapabilities.MailboxProcessor], activatesOn: InboxEvents.Start },
  () => import('./mailbox-processor'),
);

export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const SenderAction = Capability.lazyModule(
  'SenderAction',
  // Rides the inbox feature it contributes to, like its MailboxAction sibling — the entry is
  // unreachable until a conversation renders.
  { requires: [ClientCapabilities.Client], provides: [InboxCapabilities.SenderAction], activatesOn: InboxEvents.Start },
  () => import('./sender-action'),
);

export const ProjectTemplates = Capability.lazyModule(
  'ProjectTemplates',
  { provides: [ProjectCapabilities.Template], activatesOn: ProjectsEvents.Start },
  () => import('./project-templates'),
);

export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'));

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});

export const Translations = AppCapability.translations(translations);
