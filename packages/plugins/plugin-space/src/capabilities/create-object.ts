//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Collection } from '@dxos/echo';

import { SpaceOperation } from '#operations';
import { SpaceCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Collection.Collection.typename,
      createObject: ((props, options) =>
        Effect.gen(function* () {
          const object = Collection.make(props);
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            hidden: true,
            targetNodeId: options.targetNodeId,
          });
        })),
    });
  }),
);
