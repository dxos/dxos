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
      const binder = yield* Harness.binder;
      yield* Effect.promise(() =>
        binder.unbind({
          blueprints: [],
          objects: [obj],
        }),
      );
    }) as any,
  ),
);
