//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/react-client/echo';
import { StackItem, Card } from '@dxos/react-ui-stack';

import { Chess } from './Chess';
import { PlayerSelector } from './PlayerSelector';
import { type ChessType } from '../types';

const ChessContainer = ({ game, role }: { game: ChessType; role?: string }) => {
  const space = getSpace(game);

  if (!space) {
    return null;
  }

  if (role && ['card--intrinsic', 'card--extrinsic', 'popover', 'transclusion'].includes(role)) {
    return (
      <Card.SurfaceRoot role={role}>
        <Chess.Root game={game}>
          <Chess.Board />
        </Chess.Root>
      </Card.SurfaceRoot>
    );
  }

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
};

export default ChessContainer;
