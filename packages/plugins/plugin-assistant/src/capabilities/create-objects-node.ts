//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Chat } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';

import { AssistantOperation } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Chat.Chat.typename,
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
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Blueprint.Blueprint.typename,
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
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Routine.Routine.typename,
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
      }),
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Sequence.typename,
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
      }),
    ];
  }),
);
