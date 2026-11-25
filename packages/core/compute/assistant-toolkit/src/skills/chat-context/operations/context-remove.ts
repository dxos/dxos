//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import { ContextRemove } from './definitions.ts';

export default ContextRemove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      yield* AiContext.useCurrentBinder((binder) =>
        Effect.promise(() => binder.unbind({ skills: [], objects: [obj] })),
      );
    }),
  ),
);
