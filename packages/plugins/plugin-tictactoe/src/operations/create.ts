//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { TicTacToe } from '../types';
import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, size, winCondition, difficulty }) {
      return yield* Database.add(TicTacToe.make({ name, size, winCondition, difficulty }));
    }),
  ),
);

export default handler;
