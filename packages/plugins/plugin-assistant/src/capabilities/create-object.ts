//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Agent, AgentSkill, Chat } from '@dxos/assistant-toolkit';
import * as Operation from '@dxos/compute/Operation';
import * as ServiceResolver from '@dxos/compute/ServiceResolver';
import * as Skill from '@dxos/compute/Skill';
import { Sequence } from '@dxos/conductor';
import { Database, Obj, Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { AssistantOperation } from '#types';

import { getChatsPath } from '../paths';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
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
                targetNodeId: options.targetNodeId ?? getChatsPath(options.db.spaceId),
              });
            }),
        },
        {
          id: Type.getTypename(Skill.Skill),
          inputSchema: AssistantOperation.SkillForm,
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Skill.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            }),
        },
        {
          id: Type.getTypename(Sequence.Sequence),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Obj.make(Sequence.Sequence, props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            }),
        },
        {
          id: Type.getTypename(Agent.Agent),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = yield* Agent.makeInitialized({ name: '', instructions: '' }, AgentSkill.make());

              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                targetNodeId: options.targetNodeId,
              });
            }).pipe(
              Effect.provide(
                ServiceResolver.provide({ space: options.db.spaceId }, Database.Service).pipe(
                  Layer.provide(Capability.asLayer(Capabilities.ServiceResolver, ServiceResolver.ServiceResolver)),
                ),
              ),
            ),
        },
      ]),
    ];
  }),
);
