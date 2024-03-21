//
// Copyright 2024 DXOS.org
//

import { JSONSchema } from '@effect/schema';
import * as S from '@effect/schema/Schema';
import { Chess } from 'chess.js';

import { Game } from '@dxos/chess-app';
import { SignalTrigger } from '@dxos/functions-signal';
import { PublicKey } from '@dxos/keys';
import { type Space } from '@dxos/react-client/echo';

export const MoveSuggestionOutputFormat = S.struct({
  gameId: S.string,
  inputGameState: S.string.pipe(S.description('Input game state')),
  explanation: S.string.pipe(S.description('Explanation of why the move is a good suggestion')),
  from: S.string.pipe(S.description('From square')),
  to: S.string.pipe(S.description('To square')),
});

export const createSignalTrigger = (space: Space) => {
  return SignalTrigger.fromMutations(space)
    .withFilter(Game.filter((g) => g.pgn != null))
    .debounceMs(2_000)
    .unique((prev, curr) => prev.pgn === curr.pgn)
    .create((game) => {
      const chess = new Chess();
      chess.loadPgn(game.pgn);
      if (chess.turn() === 'b') {
        return null;
      }
      return {
        id: PublicKey.random().toHex(),
        kind: 'suggestion',
        metadata: {
          createdMs: Date.now(),
          source: 'plugin-chess',
        },
        data: {
          type: 'suggest-next-chess-move',
          value: {
            gameId: game.id,
            gameState: game.pgn,
            outputFormat: JSON.stringify(JSONSchema.make(MoveSuggestionOutputFormat)),
            activeObjectId: game.id,
          },
        },
      };
    });
};
