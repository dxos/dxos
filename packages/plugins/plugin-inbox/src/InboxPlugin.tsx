//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';
import { Event, Message } from '@dxos/types';

import { CalendarBlueprint, InboxBlueprint } from './blueprints';
import { AppGraphBuilder, BlueprintDefinition, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Calendar, InboxOperation, Mailbox } from './types';
import { CreateCalendarSchema } from './types/Calendar';
import { CreateMailboxSchema } from './types/Mailbox';

export const InboxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Mailbox.Mailbox.typename,
        metadata: {
          icon: 'ph--tray--regular',
          iconHue: 'rose',
          blueprints: [InboxBlueprint.Key],
          inputSchema: CreateMailboxSchema,
          createObject: ((props, { db }) =>
            Effect.gen(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = client.spaces.get(db.spaceId);
              return Mailbox.make({ ...props, space });
            })) satisfies CreateObject,
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
          inputSchema: CreateCalendarSchema,
          createObject: ((props, { db }) =>
            Effect.gen(function* () {
              const client = yield* Capability.get(ClientCapabilities.Client);
              const space = client.spaces.get(db.spaceId);
              return Calendar.make({ ...props, space });
            })) satisfies CreateObject,
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
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({
    schema: [Calendar.Calendar, Event.Event, Mailbox.Mailbox, Message.Message],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(InboxOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.make,
);
