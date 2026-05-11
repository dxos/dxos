//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Agent, AgentBlueprint, Chat } from '@dxos/assistant-toolkit';
import { Blueprint, Operation, Routine } from '@dxos/compute';
import { Sequence } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { type SpaceId } from '@dxos/keys';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities } from '@dxos/plugin-space/types';

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
        id: Sequence.typename,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Obj.make(Sequence, props);
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
            const object = yield* Agent.makeInitialized({ name: '', instructions: '' }, AgentBlueprint.make()).pipe(
              withComputeRuntime(options.db.spaceId),
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

// TODO(dmaretskyi): Extract to a helper module.
const withComputeRuntime =
  (spaceId: SpaceId) =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, Exclude<R, AutomationCapabilities.ComputeServices> | Capability.Service> =>
    Effect.gen(function* () {
      const provider = yield* Capability.get(AutomationCapabilities.ComputeRuntime).pipe(Effect.orDie);
      const runtime = yield* provider.getRuntime(spaceId).runtimeEffect;
      return yield* effect.pipe(Effect.provide(runtime));
    });
