//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { runInSpace } from '@dxos/app-framework/plugin-runtime';
import { Agent, AgentBlueprint, Chat } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Database, Feed, Obj } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { AssistantOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Chat.Chat.typename,
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
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Blueprint.Blueprint.typename,
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
        id: Routine.Routine.typename,
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
        id: Sequence.Sequence.typename,
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
        id: Agent.Agent.typename,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = yield* runInSpace(
              options.db.spaceId,
              [Database.Service, Feed.FeedService, QueueService],
              Agent.makeInitialized({ name: '', instructions: '' }, AgentBlueprint.make()),
            );
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
