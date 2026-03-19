//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ActivationEvent, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
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
        id: Mailbox.Mailbox.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Mailbox.Mailbox).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Mailbox.Mailbox).pipe(Option.getOrThrow).hue ?? 'white',
          blueprints: [InboxBlueprint.key],
          inputSchema: CreateMailboxSchema,
          createObject: ((props) => Effect.sync(() => Mailbox.make(props))) satisfies CreateObject,
        },
      },
      {
        id: Message.Message.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Message.Message).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Message.Message).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: (() => Effect.succeed(Message.make({ sender: 'user' }))) satisfies CreateObject,
        },
      },
      {
        id: Calendar.Calendar.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Calendar.Calendar).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Calendar.Calendar).pipe(Option.getOrThrow).hue ?? 'white',
          blueprints: [CalendarBlueprint.key],
          inputSchema: CreateCalendarSchema,
          createObject: ((props) => Effect.sync(() => Calendar.make(props))) satisfies CreateObject,
        },
      },
      {
        id: Event.Event.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Event.Event).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Event.Event).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props) => Effect.sync(() => Event.make(props))) satisfies CreateObject,
        },
      },
    ],
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({
    schema: [Event.Event, Mailbox.Mailbox, Calendar.Calendar, Message.Message],
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
