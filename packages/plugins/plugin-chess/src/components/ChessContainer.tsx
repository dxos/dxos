//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { PlayerSelector } from './PlayerSelector';
import { type ChessType } from '../types';
import { ChessPanel } from './ChessPanel';

const ChessContainer = ({ game, role }: { game: ChessType; role?: string }) => {
  const space = getSpace(game);
  if (!space) {
    return null;
  }

  switch (role) {
    case 'card--popover':
    case 'card--extrinsic':
    case 'card--intrinsic': {
      return <ChessPanel game={game} role={role} />;
    }

    default: {
      return (
        <StackItem.Content>
          <div role='none' className='grid grid-rows-[60px_1fr_60px] grow overflow-hidden'>
            <div />

            <div className='flex m-4 overflow-hidden'>
              <ChessPanel game={game} />
            </div>

            <PlayerSelector space={space} game={game} />
          </div>
        </StackItem.Content>
      );
    }
  }
};

export default ChessContainer;
