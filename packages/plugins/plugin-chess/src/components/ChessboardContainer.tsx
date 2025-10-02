//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';

import { type Chess } from '../types';

import { Chessboard } from './Chessboard';
import { ChessboardArticle } from './ChessboardArticle';

export type ChessboardContainerProps = {
  game: Chess.Game;
  role?: string;
};

export const ChessboardContainer = ({ game, role }: ChessboardContainerProps) => {
  const space = getSpace(game);
  if (!space) {
    return null;
  }

  switch (role) {
    case 'card--popover':
    case 'card--intrinsic':
    case 'card--extrinsic': {
      return (
        <Chessboard.Root game={game}>
          <Chessboard.Content role={role}>
            <Chessboard.Board />
          </Chessboard.Content>
        </Chessboard.Root>
      );
    }

    default: {
      return <ChessboardArticle game={game} role={role} />;
    }
  }
};

export default ChessboardContainer;
