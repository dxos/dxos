//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { loadGame } from '@dxos/plugin-game';

import { checkWin, currentTurn, placeMarker } from '#components';
import { TicTacToe } from '#types';

import { TicTacToeOperation } from '../types';

const handler: Operation.WithHandler<typeof TicTacToeOperation.MakeMove> = TicTacToeOperation.MakeMove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, position }) {
      const { variant } = yield* loadGame(game, TicTacToe.State);
      const currentStatus = checkWin(variant.board, variant.size, variant.winCondition);
      if (currentStatus !== 'playing') {
        return yield* Effect.fail(new Error('GameOver'));
      }
      const [rowStr, colStr] = position.split(',');
      const row = parseInt(rowStr, 10);
      const col = parseInt(colStr, 10);
      const marker = currentTurn(variant.board);

      const result = placeMarker(variant.board, variant.size, row, col, marker);
      if (result.error) {
        return yield* Effect.fail(new Error(result.error));
      }

      const status = checkWin(result.board, variant.size, variant.winCondition);
      const moveEntry = `${marker}:${row},${col}`;
      const moves = variant.moves ? `${variant.moves};${moveEntry}` : moveEntry;

      Obj.update(variant, (variant) => {
        const mutable = variant as Obj.Mutable<typeof variant>;
        mutable.board = result.board;
        mutable.moves = moves;
      });

      return { board: result.board, status };
    }),
  ),
);

export default handler;
