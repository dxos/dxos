//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContextService } from '@dxos/assistant';
import { Operation } from '@dxos/operation';

import { ContextAdd } from './definitions';

export default ContextAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      const { binder } = yield* AiContextService;
      yield* Effect.promise(() =>
        binder.bind({
          blueprints: [],
          objects: [obj],
        }),
      );
    }) as any,
  ),
);
