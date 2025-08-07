//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { DatabaseService, defineFunction } from '@dxos/functions';
import { log } from '@dxos/log';

import { Chess } from '../types';

export default defineFunction({
  name: 'dxos.org/function/chess/play',
  description: 'Calculates and plays the next move in the given chess game.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the chess object.',
    }),
  }),
  outputSchema: Schema.Struct({
    move: Schema.optional(Schema.String).annotations({
      description: 'The move that was played.',
    }),
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    log.info('play', { id });
    try {
      throw new Error(Date.now().toString());
    } catch (err) {
      console.log('NOT AN ERROR; JUST LOGGING STACK', err);
    }
    const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Chess.Game);

    // Create game and make move.
    const chess = new ChessJS();
    chess.loadPgn(object.pgn);
    const moves = chess.moves();
    const move = moves[Math.floor(Math.random() * moves.length)];
    log.info('move', { move });
    chess.move(move);

    // Update the game state.
    object.pgn = chess.pgn();
    return { move };
  }),
});
