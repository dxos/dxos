// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Operation from '@dxos/compute/Operation';

import * as SpaceCapabilities from '../types/SpaceCapabilities';
import * as SpaceOperation from '../types/SpaceOperation';

const handler: Operation.WithHandler<typeof SpaceOperation.WaitForObject> = SpaceOperation.WaitForObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(SpaceCapabilities.EphemeralState, (current) => ({
        ...current,
        awaiting: input.id,
      }));
    }),
  ),
);
export default handler;
