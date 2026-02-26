//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { AttentionEvents } from '@dxos/plugin-attention';
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
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Mailbox.kind,
        metadata: {
          icon: 'ph--tray--regular',
          iconHue: 'rose',
          blueprints: [InboxBlueprint.key],
          inputSchema: CreateMailboxSchema,
          createObject: ((props) =>
            Effect.gen(function* () {
              return Mailbox.make(props);
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
        id: Calendar.kind,
        metadata: {
          icon: 'ph--calendar--regular',
          iconHue: 'rose',
          blueprints: [CalendarBlueprint.key],
          inputSchema: CreateCalendarSchema,
          createObject: ((props) =>
            Effect.gen(function* () {
              return Calendar.make(props);
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
    schema: [Event.Event, Mailbox.Config, Calendar.Config, Message.Message],
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
