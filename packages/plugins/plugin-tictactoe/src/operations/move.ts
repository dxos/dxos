//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { MakeMove } from './definitions';

// TODO: Implement move logic.
const handler: Operation.WithHandler<typeof MakeMove> = MakeMove.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return yield* Effect.fail(new Error('Not implemented'));
    }),
  ),
);

export default handler;
