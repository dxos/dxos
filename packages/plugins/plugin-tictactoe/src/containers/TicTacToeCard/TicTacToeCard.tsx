//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';

import { TicTacToeBoard, getWinningCells } from '#components';
import { type TicTacToe } from '#types';

export type TicTacToeCardProps = AppSurface.ObjectCardProps<TicTacToe.Game>;

export const TicTacToeCard = ({ subject: game }: TicTacToeCardProps) => {
  const winningCells = getWinningCells(game.board, game.size, game.winCondition);

  return (
    <div className='flex items-center justify-center p-2'>
      <TicTacToeBoard board={game.board} size={game.size} winningCells={winningCells} disabled />
    </div>
  );
};
