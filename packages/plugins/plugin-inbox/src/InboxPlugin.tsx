//
// Copyright 2024 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
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
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: [
      {
        id: Mailbox.Mailbox.typename,
        metadata: {
          icon: 'ph--tray--regular',
          iconHue: 'rose',
          blueprints: [InboxBlueprint.Key],
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateMailbox, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Message.Message.typename,
        metadata: {
          icon: 'ph--note--regular',
          iconHue: 'rose',
        },
      },
      {
        id: Calendar.Calendar.typename,
        metadata: {
          icon: 'ph--calendar--regular',
          iconHue: 'rose',
          blueprints: [CalendarBlueprint.Key],
          createObjectIntent: ((_, options) =>
            createIntent(InboxAction.CreateCalendar, { db: options.db })) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      },
      {
        id: Event.Event.typename,
        metadata: {
          icon: 'ph--calendar-dot--regular',
          iconHue: 'rose',
        },
      },
    ],
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () =>
      Capability.contributes(ClientCapabilities.Schema, [
        Calendar.Calendar,
        Event.Event,
        Mailbox.Mailbox,
        Message.Message,
      ]),
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.addModule({
    id: 'blueprint',
    activatesOn: Common.ActivationEvent.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);
