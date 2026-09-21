//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { MessageExtractor } from '#operations';
import { translations } from '#translations';
import { InboxCapabilities } from '#types';

export { InboxAppGraphBuilder as AppGraphBuilder } from './app-graph-builder.ts';
export { Schema } from './schema.ts';
export { SkillDefinition } from './skill-definition.ts';
export { CreateObject } from './create-object.ts';
export { IdentitySpecs } from './identity-specs.ts';
export const ContactExtractor = Capability.makeModule(
  'contact-extractor',
  { provides: [InboxCapabilities.ObjectExtractor] },
  () =>
    Effect.succeed([
      Capability.contribute(InboxCapabilities.ObjectExtractor, MessageExtractor.ContactMessageExtractor),
    ]),
);
export const SummarizeExtractor = Capability.makeModule(
  'summarize-extractor',
  { provides: [InboxCapabilities.ObjectExtractor] },
  () =>
    Effect.succeed([
      Capability.contribute(InboxCapabilities.ObjectExtractor, MessageExtractor.SummarizeMessageExtractor),
    ]),
);
export { MailboxProcessors } from './mailbox-processors.ts';
export { AutomationTemplates } from './automation-templates.ts';
export { NavigationTargetResolver } from './navigation-target-resolver.ts';
export { OperationHandler } from './operation-handler.ts';
export { ReactSurface } from './react-surface.ts';
export { InboxSettings } from './settings.ts';
export const Translations = AppCapability.translations(translations);
