//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Database } from '@dxos/echo';
import { defineFunction } from '@dxos/functions';

import { Chess } from '../../types';

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
    return yield* Database.Service.add(Chess.makeGame({ pgn, fen }));
  }),
});
