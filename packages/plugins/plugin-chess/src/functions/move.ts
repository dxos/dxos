//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { ArtifactId } from '@dxos/assistant';
import { DatabaseService, defineFunction } from '@dxos/functions';

import { Chess } from '../types';

export default defineFunction({
  key: 'dxos.org/function/chess/move',
  name: 'Move',
  description: 'Makes a move in the given chess game.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the chess object.',
    }),
    move: Schema.String.annotations({
      description: 'The move to make in the chess game.',
      examples: ['e4', 'Bf3'],
    }),
  }),
  outputSchema: Schema.Struct({
    pgn: Schema.String.annotations({
      description: 'The PGN of the game after the move was played.',
    }),
  }),
  handler: Effect.fn(function* ({ data: { id, move } }) {
    const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Chess.Game);
    const chess = new ChessJS();
    if (object.pgn) {
      chess.loadPgn(object.pgn);
    } else if (object.fen) {
      chess.load(object.fen);
    }

    chess.move(move, { strict: false });
    object.pgn = chess.pgn();
    return { pgn: object.pgn };
  }),
});
