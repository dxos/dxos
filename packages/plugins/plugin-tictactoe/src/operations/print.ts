//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { Print } from './definitions';

// TODO: Implement print logic.
const handler: Operation.WithHandler<typeof Print> = Print.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return yield* Effect.fail(new Error('Not implemented'));
    }),
  ),
);

export default handler;
