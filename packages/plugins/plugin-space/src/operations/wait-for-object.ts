// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import * as Operation from '@dxos/compute/Operation';

import { SpaceCapabilities } from '../types';
import { SpaceOperation } from './definitions';

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
