//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Type } from '@dxos/echo';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Repository } from '#types';

/**
 * The object alone: the repository on EDGE is created by the first read of it, so creating one does
 * not wait on — or fail for want of — the network.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Repository.Repository),
      inputSchema: Schema.Struct({ name: Schema.optional(Schema.String) }),
      createObject: (props, options) =>
        Effect.gen(function* () {
          const object = Repository.make({ name: props?.name });
          return yield* Operation.invoke(
            SpaceOperation.AddObject,
            { object, target: options.target },
            { spaceId: options.db.spaceId },
          );
        }),
    });
  }),
);
