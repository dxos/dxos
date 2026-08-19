//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Dream } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Dream.Dream),
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = Dream.make(props);
          return yield* Operation.invoke(
            SpaceOperation.AddObject,
            {
              object,
              target: options.target,
            },
            { spaceId: options.db.spaceId },
          );
        }),
    });
  }),
);
