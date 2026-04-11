//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database, Obj, Ref } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { TicTacToe, canMove } from '../../types';

export default defineFunction({
  key: 'dxos.org/function/tictactoe/move',
  name: 'Move',
  description: 'Places a mark at the given cell index (0–8) for the current player.',
  inputSchema: Schema.Struct({
    game: Ref.Ref(TicTacToe.Game).annotations({
      description: 'The ID of the Tic-Tac-Toe game object.',
    }),
    cell: Schema.Number.annotations({
      description: "Cell index (0–8) to place the current player's mark.",
      examples: [0, 4, 8],
    }),
  }),
  outputSchema: Schema.Struct({
    moves: Schema.Array(Schema.Number).annotations({
      description: 'Updated moves array after the move was played.',
    }),
    error: Schema.optional(Schema.String),
  }),
  handler: Effect.fn(function* ({ data: { game, cell } }) {
    const obj = yield* Database.load(game);
    const moves = obj.moves ?? [];

    if (!canMove(moves, cell)) {
      return { moves, error: `Cannot move to cell ${cell}.` };
    }

    const updatedMoves = [...moves, cell];
    Obj.change(obj, (obj) => {
      obj.moves = updatedMoves;
    });
    return { moves: updatedMoves };
  }),
});
