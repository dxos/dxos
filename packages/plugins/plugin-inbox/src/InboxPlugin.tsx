//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Common, Plugin } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type CreateObject } from '@dxos/plugin-space/types';
import { Event, Message } from '@dxos/types';

import { CalendarBlueprint, InboxBlueprint } from './blueprints';
import { AppGraphBuilder, BlueprintDefinition, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Calendar, Mailbox } from './types';

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
          createObject: ((props, { db, context }) =>
            Effect.sync(() => {
              const client = context.getCapability(ClientCapabilities.Client);
              const space = client.spaces.get(db.spaceId);
              return Mailbox.make({ ...props, space });
            })) satisfies CreateObject,
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
          createObject: ((props, { db, context }) =>
            Effect.sync(() => {
              const client = context.getCapability(ClientCapabilities.Client);
              const space = client.spaces.get(db.spaceId);
              return Calendar.make({ ...props, space });
            })) satisfies CreateObject,
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
  Common.Plugin.addSchemaModule({
    schema: [Calendar.Calendar, Event.Event, Mailbox.Mailbox, Message.Message],
  }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.make,
);
