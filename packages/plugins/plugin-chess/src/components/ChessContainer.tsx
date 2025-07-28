//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { Chess } from './Chess';
import { PlayerSelector } from './PlayerSelector';
import { type ChessType } from '../types';

const containFragment = 'is-[min(100cqw,100cqh)] bs-[min(100cqw,100cqh)]';

const ChessContainer = ({ game, role }: { game: ChessType; role?: string }) => {
  const space = getSpace(game);

  if (!space) {
    return null;
  }

  switch (role) {
    case 'popover': {
      return (
        <Chess.Root game={game}>
          <div role='none' className='popover-square size-container'>
            <Chess.Board classNames={containFragment} />
          </div>
        </Chess.Root>
      );
    }
    case 'card--extrinsic': {
      return (
        <Chess.Root game={game}>
          <div role='none' className='grid is-full bs-full size-container place-content-center'>
            <Chess.Board classNames={containFragment} />
          </div>
        </Chess.Root>
      );
    }
    case 'card--intrinsic': {
      return (
        <Chess.Root game={game}>
          <Chess.Board />
        </Chess.Root>
      );
    }
    default: {
      return (
        <StackItem.Content>
          <div role='none' className='grid grid-rows-[60px_1fr_60px] grow overflow-hidden'>
            <div />

            <div className='flex m-4 overflow-hidden'>
              <Chess.Root game={game}>
                <Chess.Content>
                  <Chess.Board />
                </Chess.Content>
              </Chess.Root>
            </div>

            <PlayerSelector space={space} game={game} />
          </div>
        </StackItem.Content>
      );
    }
  }
};

export default ChessContainer;
