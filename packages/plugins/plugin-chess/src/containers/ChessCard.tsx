//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';

import { Chessboard } from '../components';
import { type Chess } from '../types';

export type ChessCardProps = SurfaceComponentProps<Chess.Game>;

export const ChessCard = ({ subject: game }: ChessCardProps) => {
  return (
    <Chessboard.Root game={game}>
      <Chessboard.Content>
        <Chessboard.Board />
      </Chessboard.Content>
    </Chessboard.Root>
  );
};

export default ChessCard;
