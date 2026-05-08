//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ContextBinding } from '@dxos/assistant';
import { Agent, Chat, McpServer, Memory, Plan } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Annotation, Feed, Obj, Type } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';
import { Text } from '@dxos/schema';
import { HasSubject, Message } from '@dxos/types';

import { AppGraphBuilder, BlueprintDefinition, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { AssistantOperation } from '#operations';

export const AssistantPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Type.getTypename(Chat.Chat),
        metadata: {
          icon: Annotation.IconAnnotation.get(Chat.Chat).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Chat.Chat).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const { object } = yield* Operation.invoke(AssistantOperation.CreateChat, {
                db: options.db,
                name: props?.name,
              });
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
        id: Type.getTypename(Blueprint.Blueprint),
        metadata: {
          icon: Annotation.IconAnnotation.get(Blueprint.Blueprint).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Blueprint.Blueprint).pipe(Option.getOrThrow).hue ?? 'white',
          inputSchema: AssistantOperation.BlueprintForm,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Blueprint.make(props);
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
        id: Type.getTypename(Routine.Routine),
        metadata: {
          icon: Annotation.IconAnnotation.get(Routine.Routine).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Routine.Routine).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Routine.make(props);
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
        id: Type.getTypename(Sequence),
        metadata: {
          icon: Annotation.IconAnnotation.get(Sequence).pipe(Option.getOrThrow).icon,
          iconHue: Annotation.IconAnnotation.get(Sequence).pipe(Option.getOrThrow).hue ?? 'white',
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Obj.make(Sequence, props);
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
    schema: [
      Chat.Chat,
      Chat.CompanionTo,
      Blueprint.Blueprint,
      ContextBinding,
      Feed.Feed,
      HasSubject.HasSubject,
      Message.Message,
      Routine.Routine,
      Agent.Agent,
      McpServer.McpServer,
      Plan.Plan,
      Sequence,
      Memory.Memory,
      Text.Text,
    ],
  }),
  Plugin.make,
);

export default AssistantPlugin;
