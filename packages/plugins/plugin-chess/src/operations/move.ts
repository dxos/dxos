//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { type Chess } from '../types';

import { Move } from './definitions';

export default Move.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, move }) {
      const obj = (yield* Database.load(game)) as Chess.Game;
      const chess = new ChessJS();
      if (obj.pgn) {
        chess.loadPgn(obj.pgn);
      } else if (obj.fen) {
        chess.load(obj.fen);
      }

      chess.move(move, { strict: false });
      const pgn = chess.pgn();
      Obj.change(obj, (game) => {
        const mutableGame = game as Obj.Mutable<typeof game>;
        mutableGame.pgn = pgn;
      });
      return { pgn };
    }),
  ),
);
