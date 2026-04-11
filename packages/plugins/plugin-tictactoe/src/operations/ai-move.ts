//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { AiMove } from './definitions';

// TODO: Implement AI move logic.
const handler: Operation.WithHandler<typeof AiMove> = AiMove.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return yield* Effect.fail(new Error('Not implemented'));
    }),
  ),
);

export default handler;
