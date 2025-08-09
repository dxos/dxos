//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import { Effect, Schema } from 'effect';

import { ArtifactId } from '@dxos/assistant';
import { DatabaseService, defineFunction } from '@dxos/functions';

import { Chess } from '../types';

export default defineFunction({
  name: 'dxos.org/function/chess/move',
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
  outputSchema: Schema.Boolean.annotations({
    description: 'False if the move was invalid.',
  }),
  handler: Effect.fn(function* ({ data: { id, move } }) {
    const object = yield* DatabaseService.resolve(ArtifactId.toDXN(id), Chess.Game);

    // TODO(burdon): Avoid using try/catch inside Effect generators.
    //  Use Effect's error handling mechanisms instead (e.g., Effect.try, Effect.tryPromise, Effect.catchAll, Effect.catchTag)
    try {
      const chess = new ChessJS();
      chess.loadPgn(object.pgn);
      chess.move(move, { strict: false });
      object.pgn = chess.pgn();
      return true;
    } catch {
      return false;
    }
  }),
});
