//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';

import { ChessComponent } from './ChessComponent';
import { PlayerSelector } from './PlayerSelector';
import { type ChessType } from '../types';

const ChessContainer = ({ game }: { game: ChessType; role?: string }) => {
  const space = getSpace(game);
  if (!space) {
    return null;
  }

  return (
    <StackItem.Content toolbar={false}>
      <div role='none' className='grid grid-rows-[60px_1fr_60px] grow overflow-hidden'>
        <div />

        <div className='flex m-4 overflow-hidden'>
          <ChessComponent game={game} />
        </div>

        <PlayerSelector space={space} game={game} />
      </div>
    </StackItem.Content>
  );
};

export default ChessContainer;
