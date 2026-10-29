//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Sequence } from '@dxos/conductor';
import { Obj, Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';
import { isTruthy } from '@dxos/util';

import { AssistantOperation, type AssistantOptions } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* (pluginOptions: AssistantOptions.AssistantPluginOptions | void) {
    // Withholds the create entry, not the type, so an object made in a full-catalog build still opens.
    const experimentalTypes = pluginOptions?.experimentalTypes ?? true;
    // Annotated rather than inferred so the `false` members don't cost the entries their contextual
    // typing - `createObject`'s parameters come from `CreateObjectEntry`.
    const entries: (SpaceCapabilities.CreateObjectEntry | false)[] = [
      {
        id: Type.getTypename(Chat.Chat),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const { object } = yield* Operation.invoke(
              AssistantOperation.CreateChat,
              { name: props?.name },
              { spaceId: options.db.spaceId },
            );
            return yield* Operation.invoke(
              SpaceOperation.AddObject,
              {
                object,
                target: options.target,
              },
              { spaceId: options.db.spaceId },
            );
          }),
      },
      {
        id: Type.getTypename(Skill.Skill),
        inputSchema: AssistantOperation.SkillForm,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Skill.make(props);
            return yield* Operation.invoke(
              SpaceOperation.AddObject,
              {
                object,
                target: options.target,
              },
              { spaceId: options.db.spaceId },
            );
          }),
      },
      experimentalTypes && {
        id: Type.getTypename(Sequence.Sequence),
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Obj.make(Sequence.Sequence, props);
            return yield* Operation.invoke(
              SpaceOperation.AddObject,
              {
                object,
                target: options.target,
              },
              { spaceId: options.db.spaceId },
            );
          }),
      },
    ];

    return [Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, entries.filter(isTruthy))];
  }),
);
