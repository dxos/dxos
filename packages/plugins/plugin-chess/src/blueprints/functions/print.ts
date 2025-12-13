//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { defineFunction } from '@dxos/functions';

export default defineFunction({
  key: 'dxos.org/function/chess/print',
  name: 'Print game',
  description: 'Prints the chess game to ASCII.',
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
  outputSchema: Schema.Struct({
    ascii: Schema.String,
  }),
  handler: Effect.fn(function* ({ data: { pgn, fen } }) {
    try {
      const chess = new ChessJS(fen);
      if (pgn) {
        chess.loadPgn(pgn);
      }
      return { ascii: chess.ascii() };
    } catch {
      // TODO(burdon): Error handling?
      return { ascii: '' };
    }
  }),
});
