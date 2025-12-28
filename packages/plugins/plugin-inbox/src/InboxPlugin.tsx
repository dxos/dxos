//
// Copyright 2024 DXOS.org
//

import { Capabilities, Events, Plugin, Capability, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { Event, Message } from '@dxos/types';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  CalendarBlueprint,
  InboxBlueprint,
  IntentResolver,
  ReactSurface,
} from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Calendar, InboxAction, Mailbox } from './types';

export const InboxPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () => [
      Capability.contributes(Capabilities.Metadata, {
        id: Mailbox.Mailbox.typename,
        metadata: {
          icon: 'ph--tray--regular',
          iconHue: 'rose',
          blueprints: [InboxBlueprint.Key],
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateMailbox, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
      Capability.contributes(Capabilities.Metadata, {
        id: Message.Message.typename,
        metadata: {
          icon: 'ph--note--regular',
          iconHue: 'rose',
        },
      }),
      Capability.contributes(Capabilities.Metadata, {
        id: Calendar.Calendar.typename,
        metadata: {
          icon: 'ph--calendar--regular',
          iconHue: 'rose',
          blueprints: [CalendarBlueprint.Key],
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateCalendar, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
      Capability.contributes(Capabilities.Metadata, {
        id: Event.Event.typename,
        metadata: {
          icon: 'ph--calendar-dot--regular',
          iconHue: 'rose',
        },
      }),
    ],
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      Capability.contributes(ClientCapabilities.Schema, [Calendar.Calendar, Event.Event, Mailbox.Mailbox, Message.Message]),
  }),
  Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    id: 'blueprint',
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);
