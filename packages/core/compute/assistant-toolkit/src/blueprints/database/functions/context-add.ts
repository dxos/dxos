//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Operation } from '@dxos/compute';

import { ContextAdd } from './definitions';

export default ContextAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      const { binder } = yield* AiContext.Service;
      yield* Effect.promise(() =>
        binder.bind({
          blueprints: [],
          objects: [obj],
        }),
      );
    }),
  ),
);
