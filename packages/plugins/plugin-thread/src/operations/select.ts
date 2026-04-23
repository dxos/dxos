//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/operation';

import { ThreadCapabilities } from '../types';
import { Select } from './definitions';

const handler: Operation.WithHandler<typeof Select> = Select.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* (input) {
      const registry = yield* Capability.get(Capabilities.AtomRegistry);
      const stateAtom = yield* Capability.get(ThreadCapabilities.State);
      const current = registry.get(stateAtom);
      registry.set(stateAtom, { ...current, current: input.current });
    }),
  ),
);

export default handler;
