//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceCapability from '@dxos/plugin-space/SpaceCapability';

import { MessageExtractor } from '#operations';
import { translations } from '#translations';
import { InboxCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const Schema = AppCapability.schema(() => import('./schema'));
export const SkillDefinition = AppCapability.skillDefinition(() => import('./skill-definition'), {
  environments: ['node'],
});
export const CreateObject = SpaceCapability.createObject(() => import('./create-object'), {
  environments: ['node'],
});
export const IdentitySpecs = Capability.lazyModule(
  'IdentitySpecs',
  { provides: [SpaceCapabilities.IdentitySpec] },
  () => import('./identity-specs'),
);
export const ContactExtractor = Capability.inlineModule(
  'contact-extractor',
  { provides: [InboxCapabilities.ObjectExtractor] },
  () =>
    Effect.succeed([
      Capability.contribute(InboxCapabilities.ObjectExtractor, MessageExtractor.ContactMessageExtractor),
    ]),
);
export const SummarizeExtractor = Capability.inlineModule(
  'summarize-extractor',
  { provides: [InboxCapabilities.ObjectExtractor] },
  () =>
    Effect.succeed([
      Capability.contribute(InboxCapabilities.ObjectExtractor, MessageExtractor.SummarizeMessageExtractor),
    ]),
);
export const MailboxProcessors = Capability.lazyModule(
  'MailboxProcessors',
  { provides: [InboxCapabilities.MailboxProcessor] },
  () => import('./mailbox-processors'),
);
export const AutomationTemplates = Capability.lazyModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  () => import('./automation-templates'),
);
export const NavigationTargetResolver = AppCapability.navigationResolver(() => import('./navigation-target-resolver'), {
  requires: [ClientCapabilities.Client],
});
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: [
    'org.dxos.role.article',
    'org.dxos.role.cardContent',
    'org.dxos.role.objectProperties',
    'org.dxos.role.popover',
    'org.dxos.role.related',
    'org.dxos.role.section',
  ],
});
export const InboxSettings = AppCapability.settings(() => import('./settings'), {
  provides: [InboxCapabilities.Settings],
  activatesOn: ActivationEvents.Idle,
});
export const Translations = AppCapability.translations(translations);
