//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Chess } from '../../types';

import { Play } from './definitions';

export default Play.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, side = 'any' }) {
      const object = (yield* Database.load(game)) as Chess.Game;
      const chess = new ChessJS();
      if (object.pgn) {
        chess.loadPgn(object.pgn);
      } else if (object.fen) {
        chess.load(object.fen);
      }

      if (
        !(side === 'any' || (chess.turn() === 'w' && side === 'white') || (chess.turn() === 'b' && side === 'black'))
      ) {
        return { move: undefined, pgn: object.pgn! };
      }

      const moves = chess.moves();
      const move = moves[Math.floor(Math.random() * moves.length)];

      chess.move(move, { strict: false });
      const pgn = chess.pgn();
      Obj.change(object, (o: Chess.Game) => {
        o.pgn = pgn;
      });
      return { move, pgn };
    }),
  ),
);
