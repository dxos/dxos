//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import * as GameUtil from '@dxos/plugin-game/GameUtil';

import { Chess, ChessOperation } from '#types';

const handler: Operation.WithHandler<typeof ChessOperation.Move> = ChessOperation.Move.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, move }) {
      const { game: loaded, variant } = yield* GameUtil.loadGame(game, Chess.State);
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
      // The game's description is its current position, so tables and cards can show it.
      Obj.update(loaded, (loaded) => {
        loaded.description = chess.fen();
      });
      return { pgn };
    }),
  ),
);

export default handler;
