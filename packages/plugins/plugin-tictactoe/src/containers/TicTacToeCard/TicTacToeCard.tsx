//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { useObject } from '@dxos/echo-react';

import { TicTacToeBoard, getWinningCells } from '#components';
import { type TicTacToe } from '#types';

export type TicTacToeCardProps = AppSurface.ObjectCardProps<TicTacToe.Game>;

export const TicTacToeCard = ({ subject: game }: TicTacToeCardProps) => {
  const [board] = useObject(game, 'board');
  const [size] = useObject(game, 'size');
  const [winCondition] = useObject(game, 'winCondition');
  const winningCells = getWinningCells(board, size, winCondition);

  return (
    <div className='flex items-center justify-center p-2'>
      <TicTacToeBoard board={board} size={size} winningCells={winningCells} disabled />
    </div>
  );
};
