//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';

import { TicTacToeBoard } from '../../components/TicTacToeBoard';
import { type TicTacToe } from '../../types';

export type TicTacToeCardProps = SurfaceComponentProps<TicTacToe.Game>;

export const TicTacToeCard = ({ subject: game }: TicTacToeCardProps) => (
  <TicTacToeBoard.Root game={game}>
    <TicTacToeBoard.Content role='card--content'>
      <TicTacToeBoard.Board />
    </TicTacToeBoard.Content>
  </TicTacToeBoard.Root>
);
