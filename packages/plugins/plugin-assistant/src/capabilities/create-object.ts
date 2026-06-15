//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Capability, Capabilities } from '@dxos/app-framework';
import { Agent, AgentBlueprint, Chat } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine, ServiceResolver } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Database, Feed, Obj, Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { AssistantOperation } from '#types';

import { getChatsPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Chat.Chat),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const { object } = yield* Operation.invoke(AssistantOperation.CreateChat, {
              db: options.db,
              name: props?.name,
            });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId ?? getChatsPath(options.db.spaceId),
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Blueprint.Blueprint),
        inputSchema: AssistantOperation.BlueprintForm,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Blueprint.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Routine.Routine),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Routine.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Sequence.Sequence),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Obj.make(Sequence.Sequence, props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Type.getTypename(Agent.Agent),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = yield* Agent.makeInitialized({ name: '', instructions: '' }, AgentBlueprint.make());

            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }).pipe(
            Effect.provide(
              ServiceResolver.provide({ space: options.db.spaceId }, Database.Service, Feed.FeedService).pipe(
                Layer.provide(Capability.asLayer(Capabilities.ServiceResolver, ServiceResolver.ServiceResolver)),
              ),
            ),
          ),
      }),
    ];
  }),
);
