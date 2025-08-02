//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { type Chess } from '../types';
import { Chessboard } from './Chessboard';

export type ChessContainerProps = {
  game: Chess.Game;
  role?: string;
};

export const ChessContainer = ({ game, role }: ChessContainerProps) => {
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
      return (
        <StackItem.Content>
          <Chessboard.Root game={game}>
            <div role='none' className='grid grid-rows-[5rem_1fr_5rem] grow overflow-hidden'>
              <div />
              <Chessboard.Content>
                <Chessboard.Board />
              </Chessboard.Content>
              <Chessboard.Players />
            </div>
          </Chessboard.Root>
        </StackItem.Content>
      );
    }
  }
};

export default ChessContainer;
