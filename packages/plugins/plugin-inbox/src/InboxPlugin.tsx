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
import { SpaceCapabilities, SpaceEvents, type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { Event, Message } from '@dxos/types';

import { CalendarBlueprint, InboxBlueprint } from '#blueprints';
import { meta } from '#meta';
import { translations } from './translations';
import { InboxOperation } from '#operations';
import { Calendar, Mailbox } from '#types';
import { CreateCalendarSchema } from './types/Calendar';
import { CreateMailboxSchema } from './types/Mailbox';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  NavigationResolver,
  OperationHandler,
  ReactSurface,
} from '#capabilities';

export const InboxPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    activatesOn: ActivationEvent.allOf(AppActivationEvents.SetupAppGraph, AttentionEvents.AttentionReady),
    activate: AppGraphBuilder,
  }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addNavigationResolverModule({ activate: NavigationResolver }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Mailbox.Mailbox.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Mailbox.Mailbox).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Mailbox.Mailbox).pipe(Option.getOrThrow).hue ?? 'white',
          blueprints: [InboxBlueprint.key],
          inputSchema: CreateMailboxSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Mailbox.make(props);
              return yield* Operation.invoke(InboxOperation.AddMailbox, {
                object,
                target: options.target,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Message.Message.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Message.Message).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Message.Message).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Message.make({ sender: 'user' });
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Calendar.Calendar.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Calendar.Calendar).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Calendar.Calendar).pipe(Option.getOrThrow).hue ?? 'white',
          blueprints: [CalendarBlueprint.key],
          inputSchema: CreateCalendarSchema,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Calendar.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
      {
        id: Event.Event.typename,
        metadata: {
          icon: Annotation.IconAnnotation.get(Event.Event).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Event.Event).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Event.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        },
      },
    ],
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
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
