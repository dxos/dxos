//
// Copyright 2025 DXOS.org
//

import { Effect, Schema } from 'effect';

import { DatabaseService, defineFunction } from '@dxos/functions';

import { Chess } from '../types';

export default defineFunction({
  key: 'dxos.org/function/chess/create',
  name: 'Create Chess',
  description: 'Creates a new chess game.',
  inputSchema: Schema.Struct({
    pgn: Schema.optional(
      Schema.String.annotations({
        description: 'Portable Game Notation.',
      }),
    ),
    fen: Schema.optional(
      Schema.String.annotations({
        description: 'Forsyth-Edwards Notation.',
      }),
    ),
  }),
  outputSchema: Chess.Game,
  handler: Effect.fn(function* ({ data: { pgn, fen } }) {
    return yield* DatabaseService.add(Chess.makeGame({ pgn, fen }));
  }),
});
