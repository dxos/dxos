//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { Trip } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [
      Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Trip.Trip.typename,
        createObject: (props, options) =>
          Effect.gen(function* () {
            const object = Trip.make({
              name: typeof (props as { name?: unknown }).name === 'string' ? (props as { name: string }).name : undefined,
            });
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              targetNodeId: options.targetNodeId,
            });
          }),
      }),
    ];
  }),
);
