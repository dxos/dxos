//
// Copyright 2025 DXOS.org
//

import { Chess as ChessJS } from 'chess.js';
import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/operation';

import { Print } from './definitions';

const handler: Operation.WithHandler<typeof Print> = Print.pipe(
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
