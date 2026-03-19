//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { DeleteMemory } from './definitions';

export default DeleteMemory.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ memory }) {
      const memoryObj = yield* Database.load(memory);
      yield* Database.remove(memoryObj);
    }),
  ),
);
