//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import { Operation } from '@dxos/compute';

import { ContextRemove } from './definitions';

export default ContextRemove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      const { binder } = yield* AiContext.Service;
      yield* Effect.promise(() =>
        binder.unbind({
          blueprints: [],
          objects: [obj],
        }),
      );
    }) as any,
  ),
);
