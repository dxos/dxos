//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { CodeProject, Spec } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributeAll(SpaceCapabilities.CreateObjectEntry, [
        {
          id: Type.getTypename(Spec.Spec),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const object = Spec.make(props);
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
          id: Type.getTypename(CodeProject.CodeProject),
          createObject: (props, options) =>
            Effect.gen(function* () {
              const spec = Spec.make();
              const project = CodeProject.make({ name: props?.name, spec });
              // Add the linked Spec to the space so the Ref resolves.
              yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object: spec,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
              return yield* Operation.invoke(
                SpaceOperation.AddObject,
                {
                  object: project,
                  target: options.target,
                },
                { spaceId: options.db.spaceId },
              );
            }),
        },
      ]),
    ];
  }),
);
