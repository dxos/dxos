//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { DeleteMemory } from './definitions';

export default DeleteMemory.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ memory }) {
      const memoryObj = yield* Database.load(memory);
      yield* Database.remove(memoryObj);
      yield* Database.flush();
    }),
  ),
);
