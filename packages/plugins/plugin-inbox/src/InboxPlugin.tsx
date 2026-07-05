//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { AttentionEvents } from '@dxos/plugin-attention';
import { ClientEvents } from '@dxos/plugin-client';
import { TagIndex } from '@dxos/schema';
import { Event, Message } from '@dxos/types';

import {
  AppGraphBuilder,
  Connector,
  CreateObject,
  InboxSettings,
  NavigationResolver,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { ContactMessageExtractor, SummarizeMessageExtractor } from '#operations';
import { translations } from '#translations';
import { Calendar, ExtractedFrom, InboxCapabilities, InboxEvents, Mailbox, ThreadIndex } from '#types';

export const InboxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addNavigationResolverModule({ activatesOn: ClientEvents.ClientReady, activate: NavigationResolver }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [
      Event.Event,
      Mailbox.Mailbox,
      Calendar.Calendar,
      Message.Message,
      ExtractedFrom.ExtractedFrom,
      TagIndex.TagIndex,
      ThreadIndex.ThreadIndex,
    ],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    firesAfterActivation: [InboxEvents.SettingsReady],
    activate: InboxSettings,
  }),
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupConnectors,
    activate: Connector,
  }),
  Plugin.addModule({
    id: 'contact-extractor',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(InboxCapabilities.ObjectExtractor, ContactMessageExtractor)),
  }),
  Plugin.addModule({
    id: 'summarize-extractor',
    activatesOn: ActivationEvents.Startup,
    activate: () =>
      Effect.succeed(Capability.contributes(InboxCapabilities.ObjectExtractor, SummarizeMessageExtractor)),
  }),
  Plugin.make,
);

export default InboxPlugin;
