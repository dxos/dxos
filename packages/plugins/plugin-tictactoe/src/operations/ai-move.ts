//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Obj } from '@dxos/echo';
import { loadGame } from '@dxos/plugin-game';

import { checkWin, computeAiMove, currentTurn } from '#components';
import { TicTacToe } from '#types';

import { TicTacToeOperation } from '../types';

const handler: Operation.WithHandler<typeof TicTacToeOperation.AiMove> = TicTacToeOperation.AiMove.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ game, level }) {
      const { variant } = yield* loadGame(game, TicTacToe.State);
      const currentStatus = checkWin(variant.board, variant.size, variant.winCondition);
      if (currentStatus !== 'playing') {
        return yield* Effect.fail(new Error('GameOver'));
      }
      const marker = currentTurn(variant.board);
      const diff = level ?? variant.level ?? 'medium';

      const moveIndex = computeAiMove(variant.board, variant.size, variant.winCondition, marker, diff);
      if (moveIndex === -1) {
        return yield* Effect.fail(new Error('GameOver'));
      }

      const row = Math.floor(moveIndex / variant.size);
      const col = moveIndex % variant.size;
      const newBoard = variant.board.substring(0, moveIndex) + marker + variant.board.substring(moveIndex + 1);
      const status = checkWin(newBoard, variant.size, variant.winCondition);
      const moveEntry = `${marker}:${row},${col}`;
      const moves = variant.moves ? `${variant.moves};${moveEntry}` : moveEntry;

      Obj.update(variant, (variant) => {
        const mutable = variant as Obj.Mutable<typeof variant>;
        mutable.board = newBoard;
        mutable.moves = moves;
      });

      return { board: newBoard, status, position: `${row},${col}` };
    }),
  ),
);

export default handler;
