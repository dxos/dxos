//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { mx } from '@dxos/ui-theme';

export type TicTacToeBoardProps = {
  board: string;
  size: number;
  winningCells?: number[];
  disabled?: boolean;
  onCellClick?: (row: number, col: number) => void;
};

const XMarker = () => (
  <svg viewBox='0 0 100 100' className='w-3/5 h-3/5 text-red-500 animate-in zoom-in-0 duration-300'>
    <line x1='15' y1='15' x2='85' y2='85' stroke='currentColor' strokeWidth='12' strokeLinecap='round' />
    <line x1='85' y1='15' x2='15' y2='85' stroke='currentColor' strokeWidth='12' strokeLinecap='round' />
  </svg>
);

const OMarker = () => (
  <svg viewBox='0 0 100 100' className='w-3/5 h-3/5 text-blue-500 animate-in zoom-in-0 duration-300'>
    <circle cx='50' cy='50' r='35' fill='none' stroke='currentColor' strokeWidth='12' />
  </svg>
);

type CellProps = {
  value: string;
  isWinning: boolean;
  isLastPlaced: boolean;
  disabled: boolean;
  ariaLabel: string;
  onClick: () => void;
};

const Cell = ({ value, isWinning, isLastPlaced, disabled, ariaLabel, onClick }: CellProps) => {
  const isEmpty = value === '-';
  const canClick = isEmpty && !disabled;

  return (
    <button
      className={mx(
        'aspect-square flex items-center justify-center rounded-sm transition-colors',
        isWinning
          ? 'animate-pulse bg-emerald-100 dark:bg-emerald-900/40'
          : 'bg-neutral-100 dark:bg-neutral-800',
        canClick && 'hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer',
        !canClick && isEmpty && 'cursor-not-allowed opacity-60',
      )}
      disabled={!canClick}
      aria-label={ariaLabel}
      onClick={canClick ? onClick : undefined}
    >
      {value === 'X' && <XMarker key={isLastPlaced ? 'last' : 'x'} />}
      {value === 'O' && <OMarker key={isLastPlaced ? 'last' : 'o'} />}
    </button>
  );
};

export const TicTacToeBoard = ({
  board,
  size,
  winningCells = [],
  disabled = false,
  onCellClick,
}: TicTacToeBoardProps) => {
  const [lastPlaced, setLastPlaced] = useState<number | null>(null);

  const handleCellClick = (index: number, row: number, col: number) => {
    setLastPlaced(index);
    onCellClick?.(row, col);
  };

  return (
    <div
      className='aspect-square w-full max-w-[400px]'
      style={{ display: 'grid', gridTemplateColumns: `repeat(${size}, 1fr)`, gap: '4px' }}
    >
      {Array.from({ length: size * size }, (_, index) => {
        const row = Math.floor(index / size);
        const col = index % size;
        const value = board[index] ?? '-';
        const isWinning = winningCells.includes(index);
        const isLastPlaced = lastPlaced === index;
        const marker = value === 'X' ? 'X' : value === 'O' ? 'O' : 'empty';

        return (
          <Cell
            key={index}
            value={value}
            isWinning={isWinning}
            isLastPlaced={isLastPlaced}
            disabled={disabled}
            ariaLabel={`Cell ${row + 1},${col + 1}: ${marker}`}
            onClick={() => handleCellClick(index, row, col)}
          />
        );
      })}
    </div>
  );
};
