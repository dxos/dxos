//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Topic } from '@dxos/compute';
import { AccessToken, Cursor } from '@dxos/link';
import { ClientEvents } from '@dxos/plugin-client';
import { TagIndex } from '@dxos/schema';
import { Event, Message } from '@dxos/types';

import {
  AppGraphBuilder,
  Connector,
  CreateObject,
  InboxSettings,
  NavigationTargetResolver,
  OperationHandler,
  ReactSurface,
  SkillDefinition,
} from '#capabilities';
import { meta } from '#meta';
import { ContactMessageExtractor, SummarizeMessageExtractor } from '#operations';
import { translations } from '#translations';
import { Calendar, ExtractedFrom, InboxCapabilities, InboxEvents, Mailbox } from '#types';

export const InboxPlugin = Plugin.define(meta).pipe(
  // Register on the default app-graph setup event so the mailbox/calendar URL keys are in the key table
  // before the deck's URL handler runs its startup navigation (a missing key makes the path unparseable).
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addSkillDefinitionModule({ activate: SkillDefinition }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  Plugin.addModule({ activatesOn: ClientEvents.ClientReady, activate: NavigationTargetResolver }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [
      Event.Event,
      Mailbox.Mailbox,
      Calendar.Calendar,
      Message.Message,
      ExtractedFrom.ExtractedFrom,
      TagIndex.TagIndex,
      Topic.Topic,
      AccessToken.AccessToken,
      Cursor.Cursor,
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
