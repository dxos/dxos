//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { checkWin, computeAiMove, currentTurn } from '#components';
import { type TicTacToe } from '#types';

import { AiMove } from './definitions';

const handler: Operation.WithHandler<typeof AiMove> = AiMove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, level }) {
      const obj = (yield* Database.load(game)) as TicTacToe.Game;
      const marker = currentTurn(obj.board);
      const diff = level ?? obj.level ?? 'medium';

      const moveIndex = computeAiMove(obj.board, obj.size, obj.winCondition, marker, diff);
      if (moveIndex === -1) {
        return yield* Effect.fail(new Error('GameOver'));
      }

      const row = Math.floor(moveIndex / obj.size);
      const col = moveIndex % obj.size;
      const newBoard = obj.board.substring(0, moveIndex) + marker + obj.board.substring(moveIndex + 1);
      const status = checkWin(newBoard, obj.size, obj.winCondition);
      const moveEntry = `${marker}:${row},${col}`;
      const moves = obj.moves ? `${obj.moves};${moveEntry}` : moveEntry;

      Obj.change(obj, (game) => {
        const mutable = game as Obj.Mutable<typeof game>;
        mutable.board = newBoard;
        mutable.moves = moves;
      });

      return { board: newBoard, status, position: `${row},${col}` };
    }),
  ),
);

export default handler;
