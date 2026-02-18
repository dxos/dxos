//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';

import { type Chess } from '../types';

import { Chessboard } from './Chessboard';
import { ChessboardArticle } from './ChessboardArticle';

export type ChessboardContainerProps = SurfaceComponentProps<Chess.Game>;

export const ChessboardContainer = ({ role, subject: game }: ChessboardContainerProps) => {
  const db = Obj.getDatabase(game);
  if (!db) {
    return null;
  }

  switch (role) {
    case 'card--content': {
      return (
        <Chessboard.Root game={game}>
          <Chessboard.Content>
            <Chessboard.Board />
          </Chessboard.Content>
        </Chessboard.Root>
      );
    }

    default: {
      return <ChessboardArticle role={role} subject={game} />;
    }
  }
};

export default ChessboardContainer;
