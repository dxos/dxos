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
  description: 'Calculates and plays the next move in the chess game.',
  inputSchema: Schema.Struct({
    id: ArtifactId.annotations({
      description: 'The ID of the chess object.',
    }),
  }),
  outputSchema: Schema.Struct({
    move: Schema.optional(Schema.String),
  }),
  handler: Effect.fn(function* ({ data: { id } }) {
    log.info('play', { id });

    // const obj: Chess.Game = Obj.make<typeof Chess.Game>(Chess.Game, {} as any);
    // console.log(obj);

    const object: Chess.Game = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Chess.Game, true);

    // Create game and make move.
    const chess = new ChessJS();
    chess.loadPgn(object.pgn);
    const moves = chess.moves();
    const move = moves[moves.length - 1];

    // Update the game state.
    object.pgn = chess.pgn();
    return { move };
  }),
});
