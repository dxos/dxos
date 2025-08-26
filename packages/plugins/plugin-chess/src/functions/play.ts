//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { DatabaseService, defineFunction } from '@dxos/functions';

import { Chess } from '../types';

export default defineFunction({
  name: 'dxos.org/function/chess/play',
  description: 'Uses the chess engine to play the next move.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the chess object.',
    }),
  }),
  outputSchema: Schema.Struct({
    pgn: Schema.String.annotations({
      description: 'The PGN of the game after the move was played.',
    }),
    move: Schema.optional(Schema.String).annotations({
      description: 'The move that was played.',
    }),
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Chess.Game);
    const chess = new ChessJS();
    if (object.pgn) {
      chess.loadPgn(object.pgn);
    } else if (object.fen) {
      chess.load(object.fen);
    }

    const moves = chess.moves();
    const move = moves[Math.floor(Math.random() * moves.length)];

    chess.move(move, { strict: false });
    object.pgn = chess.pgn();
    return { move, pgn: object.pgn };
  }),
});
