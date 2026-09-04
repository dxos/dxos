//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Blog } from '#types';

// `BloggerOperation.AddPublication`/`AddPost` persist via `CollectionModel.add` and return a `Ref`
// for agent/skill callers; they don't produce the `{ id, subject, object }` shape the generic
// "create object" menu needs to navigate to the new object, so both entries below construct the
// object directly and file it via `SpaceOperation.AddObject` instead, matching every other plugin's
// `create-object.ts` (e.g. `plugin-gallery`, `plugin-tasks`). The in-publication "+ Post" path
// (which does use `AddPost`) is wired separately in Tasks 7/9.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Blog.Publication),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Blog.makePublication(props);
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
          id: Type.getTypename(Blog.Post),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Blog.makePost(props);
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                { object, target: options.target },
                { spaceId: options.db.spaceId },
              );
            }),
        },
      ]),
    ];
  }),
);
