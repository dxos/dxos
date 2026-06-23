//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import { Operation } from '@dxos/compute';

import { ContextAdd } from './definitions';

export default ContextAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      const binder = yield* Harness.binder;
      yield* Effect.promise(() =>
        binder.bind({
          blueprints: [],
          objects: [obj],
        }),
      );
    }),
  ),
);
