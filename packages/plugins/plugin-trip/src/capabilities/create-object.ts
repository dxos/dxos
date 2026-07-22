//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { Trip } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.provide(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(Trip.Trip),
      createObject: (props, options) =>
        Effect.gen(function* () {
          const name =
            props != null && typeof (props as { name?: unknown }).name === 'string'
              ? (props as { name: string }).name
              : undefined;
          const object = Trip.make({ name });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            targetNodeId: options.targetNodeId,
          });
        }),
    });
  }),
);
