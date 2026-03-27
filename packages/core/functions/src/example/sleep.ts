//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import { Sleep } from './definitions';
import { Operation } from '@dxos/operation';

export default Sleep.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ duration = 100_000 }) {
      yield* Effect.sleep(duration);
    }),
  ),
);
