//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Button } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { type TicTacToeType } from '../types';

export interface TicTacToeBoardProps {
  game: TicTacToeType;
  onCellClick: (row: number, col: number) => void;
}

export const TicTacToeBoard = ({ game, onCellClick }: TicTacToeBoardProps) => {
  const handleCellClick = (row: number, col: number) => {
    if (game.gameOver || game.board[row][col]) {
      return;
    }

    onCellClick(row, col);
  };

  const renderCell = (row: number, col: number) => {
    const value = game.board[row][col];
    return (
      <Button
        key={`${row}-${col}`}
        variant='ghost'
        classNames={mx(
          'w-16 h-16 text-2xl font-bold border border-neutral-300',
          'hover:bg-neutral-100 disabled:opacity-50',
          value === 'X' && 'text-blue-600',
          value === 'O' && 'text-red-600',
        )}
        onClick={() => handleCellClick(row, col)}
        disabled={game.gameOver || !!value}
      >
        {value || ''}
      </Button>
    );
  };

  return (
    <div className='flex flex-col items-center gap-4'>
      <div className='grid grid-cols-3 gap-1'>
        {Array.from({ length: 3 }, (_, row) => Array.from({ length: 3 }, (_, col) => renderCell(row, col)))}
      </div>

      <div className='text-center'>
        {game.gameOver ? (
          <div className='text-lg font-semibold'>{game.winner === 'draw' ? 'Draw!' : `Winner: ${game.winner}`}</div>
        ) : (
          <div className='text-lg'>Current Player: {game.currentPlayer}</div>
        )}
      </div>
    </div>
  );
};
