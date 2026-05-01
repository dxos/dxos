//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database, Obj } from '@dxos/echo';

import { checkWin, currentTurn, placeMarker } from '#components';
import { type TicTacToe } from '#types';

import { MakeMove } from './definitions';

const handler: Operation.WithHandler<typeof MakeMove> = MakeMove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, position }) {
      const obj = (yield* Database.load(game)) as TicTacToe.Game;
      const currentStatus = checkWin(obj.board, obj.size, obj.winCondition);
      if (currentStatus !== 'playing') {
        return yield* Effect.fail(new Error('GameOver'));
      }
      const [rowStr, colStr] = position.split(',');
      const row = parseInt(rowStr, 10);
      const col = parseInt(colStr, 10);
      const marker = currentTurn(obj.board);

      const result = placeMarker(obj.board, obj.size, row, col, marker);
      if (result.error) {
        return yield* Effect.fail(new Error(result.error));
      }

      const status = checkWin(result.board, obj.size, obj.winCondition);
      const moveEntry = `${marker}:${row},${col}`;
      const moves = obj.moves ? `${obj.moves};${moveEntry}` : moveEntry;

      Obj.change(obj, (obj) => {
        const mutable = obj as Obj.Mutable<typeof obj>;
        mutable.board = result.board;
        mutable.moves = moves;
      });

      return { board: result.board, status };
    }),
  ),
);

export default handler;
