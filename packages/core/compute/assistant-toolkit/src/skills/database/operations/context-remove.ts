//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';

import { ContextRemove } from './definitions';

export default ContextRemove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      const sessionBinder = yield* Harness.binder;
      yield* Effect.promise(() =>
        sessionBinder.unbind({
          skills: [],
          objects: [obj],
        }),
      );
    }),
  ),
);
