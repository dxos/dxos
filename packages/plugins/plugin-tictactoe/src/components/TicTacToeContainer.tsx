//
// Copyright 2023 DXOS.org
//

import React, { useCallback } from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { Button } from '@dxos/react-ui';

import { TicTacToeBoard } from './TicTacToeBoard';
import { type TicTacToeType, type Player, type CellValue } from '../types';

export interface TicTacToeContainerProps {
  game: TicTacToeType;
  role?: string;
}

const checkWinner = (board: CellValue[][]): Player | 'draw' | null => {
  const lines = [
    // Rows
    [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
    [
      [1, 0],
      [1, 1],
      [1, 2],
    ],
    [
      [2, 0],
      [2, 1],
      [2, 2],
    ],
    // Columns
    [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
    [
      [0, 1],
      [1, 1],
      [2, 1],
    ],
    [
      [0, 2],
      [1, 2],
      [2, 2],
    ],
    // Diagonals
    [
      [0, 0],
      [1, 1],
      [2, 2],
    ],
    [
      [0, 2],
      [1, 1],
      [2, 0],
    ],
  ];

  for (const line of lines) {
    const [a, b, c] = line.map(([row, col]) => board[row][col]);
    if (a && a === b && b === c) {
      return a as Player;
    }
  }

  const isFull = board.every((row) => row.every((cell) => cell !== null));
  if (isFull) {
    return 'draw';
  }

  return null;
};

export const TicTacToeContainer = ({ game, role }: TicTacToeContainerProps) => {
  const space = getSpace(game);

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (!space || game.gameOver || game.board[row][col]) {
        return;
      }

      // Make the move
      const newBoard = game.board.map((r, rowIndex) =>
        r.map((cell, colIndex) => {
          if (rowIndex === row && colIndex === col) {
            return game.currentPlayer;
          }
          return cell;
        }),
      );

      // Check for winner
      const winner = checkWinner(newBoard);
      const gameOver = winner !== null;

      // Update the game state
      game.board = newBoard;
      game.currentPlayer = game.currentPlayer === 'X' ? 'O' : 'X';

      if (gameOver) {
        game.winner = winner === 'draw' ? 'draw' : winner;
        game.gameOver = true;
      }
    },
    [game, space],
  );

  const handleReset = useCallback(() => {
    if (!space) {
      return;
    }

    game.board = [
      [null, null, null],
      [null, null, null],
      [null, null, null],
    ];
    game.currentPlayer = 'X';
    game.winner = undefined;
    game.gameOver = false;
  }, [game, space]);

  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-col items-center gap-4 p-4'>
      <TicTacToeBoard game={game} onCellClick={handleCellClick} />

      <Button variant='primary' onClick={handleReset} classNames='mt-4'>
        Reset Game
      </Button>
    </div>
  );
};
