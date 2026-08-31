//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Harness } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import { ContextAdd } from './definitions';

export default ContextAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      const sessionBinder = yield* Harness.binder;
      yield* Effect.promise(() =>
        sessionBinder.bind({
          skills: [],
          objects: [obj],
        }),
      );
    }),
  ),
);
