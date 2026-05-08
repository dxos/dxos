//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContextService } from '@dxos/assistant';
import { Operation } from '@dxos/compute';

import { ContextRemove } from './definitions';

const handler: Operation.WithHandler<Operation.Definition.Any> = ContextRemove.pipe(
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

export default handler;
