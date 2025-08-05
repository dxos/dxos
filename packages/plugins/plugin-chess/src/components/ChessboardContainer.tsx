//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { type Chess } from '../types';

import { Chessboard } from './Chessboard';

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
      return (
        <StackItem.Content classNames='bs-full is-full overflow-hidden'>
          <Chessboard.Root game={game}>
            <div className='grid grid-cols-[1fr_min-content] gap-2'>
              <div role='none' className='grid grid-rows-[5rem_1fr_5rem]'>
                <div />
                <Chessboard.Content>
                  <Chessboard.Board />
                </Chessboard.Content>
                <Chessboard.Players />
              </div>
              <div className='p-2'>
                <Chessboard.Info />
              </div>
            </div>
          </Chessboard.Root>
        </StackItem.Content>
      );
    }
  }
};

export default ChessboardContainer;
