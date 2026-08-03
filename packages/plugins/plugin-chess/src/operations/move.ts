//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { loadGame } from '@dxos/plugin-game';

import * as Chess from '../types/Chess';
import * as ChessOperation from '../types/ChessOperation';

const handler: Operation.WithHandler<typeof ChessOperation.Move> = ChessOperation.Move.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, move }) {
      const { variant } = yield* loadGame(game, Chess.State);
      const chess = new ChessJS();
      if (variant.pgn) {
        chess.loadPgn(variant.pgn);
      } else if (variant.fen) {
        chess.load(variant.fen);
      }

      chess.move(move, { strict: false });
      const pgn = chess.pgn();
      Obj.update(variant, (variant) => {
        variant.pgn = pgn;
      });
      return { pgn };
    }),
  ),
);

export default handler;
