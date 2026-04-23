//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContextService } from '@dxos/assistant';
import { Operation } from '@dxos/operation';

import { ContextRemove } from './definitions';

export default ContextRemove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      const { binder } = yield* AiContextService;
      yield* Effect.promise(() =>
        binder.unbind({
          blueprints: [],
          objects: [obj],
        }),
      );
    }) as any,
  ),
);
