//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';

import { type TicTacToe } from '#types';

export type TicTacToeCardProps = AppSurface.ObjectCardProps<TicTacToe.Game>;

export const TicTacToeCard = ({ subject: game }: TicTacToeCardProps) => {
  return (
    <div className='flex items-center justify-center p-2'>
      <p>{game.name ?? 'Tic-Tac-Toe'}</p>
    </div>
  );
};
