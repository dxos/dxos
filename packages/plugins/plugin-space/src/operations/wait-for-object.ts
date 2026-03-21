// Copyright 2025 DXOS.org

import * as Effect from 'effect/Effect';

import { Capabilities, type Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { SpaceCapabilities } from '../types';

import { SpaceOperation } from './definitions';

export default SpaceOperation.WaitForObject.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      yield* Capabilities.updateAtomValue(SpaceCapabilities.EphemeralState, (current) => ({
        ...current,
        awaiting: input.id,
      }));
    }),
  ),
);
