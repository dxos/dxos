//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';

import { ChessOperation } from '../types';

const handler: Operation.WithHandler<typeof ChessOperation.Print> = ChessOperation.Print.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ pgn, fen }) {
      try {
        const chess = new ChessJS(fen);
        if (pgn) {
          chess.loadPgn(pgn);
        }
        return { ascii: chess.ascii() };
      } catch {
        return { ascii: '' };
      }
    }),
  ),
);

export default handler;
