//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { Obj } from '@dxos/echo';
import { DatabaseService, defineFunction } from '@dxos/functions';

import { Chess } from '../types';

export default defineFunction({
  name: 'dxos.org/function/chess/play',
  description: 'Plays the chess game.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the chess object.',
    }),
    pgn: Schema.String.annotations({
      description: 'The PGN of the chess object.',
    }),
  }),
  outputSchema: Schema.Struct({
    move: Schema.optional(Schema.String),
  }),
  handler: Effect.fn(function* ({ data: { id, pgn } }) {
    const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id));
    if (!object || !Obj.instanceOf(Chess.Game, object)) {
      throw new Error('Object not found.');
    }

    // Select the next move.
    const chess = new ChessJS();
    chess.loadPgn(pgn);
    const moves = chess.moves();
    const move = moves[moves.length - 1];

    // Update the game.
    object.pgn = chess.pgn();

    return { move };
  }),
});
