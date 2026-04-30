//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { TicTacToe } from '#types';

import { Create } from './definitions';

const handler: Operation.WithHandler<typeof Create> = Create.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, size, winCondition, level }) {
      return yield* Database.add(TicTacToe.make({ name, size, winCondition, level }));
    }),
  ),
);

export default handler;
