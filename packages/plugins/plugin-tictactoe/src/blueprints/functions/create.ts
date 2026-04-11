//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { TicTacToe } from '../../types';

export default defineFunction({
  key: 'dxos.org/function/tictactoe/create',
  name: 'Create Tic-Tac-Toe',
  description: 'Creates a new Tic-Tac-Toe game.',
  inputSchema: Schema.Struct({
    name: Schema.optional(
      Schema.String.annotations({
        description: 'Name of the game.',
      }),
    ),
  }),
  outputSchema: TicTacToe.Game,
  handler: Effect.fn(function* ({ data: { name } }) {
    return yield* Database.add(TicTacToe.make({ name }));
  }),
});
