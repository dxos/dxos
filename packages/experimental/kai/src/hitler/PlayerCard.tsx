//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { withReactor } from '@dxos/react-client';

import { CardRow } from '../components';
import { State, Player } from '../proto';
import { useGame } from './useGame';

export const PlayerCard = withReactor(({ player }: { player: Player }) => {
  const game = useGame();
  return (
    <CardRow header='Player'>
      <div className='h-[300px] w-[500px]'>
        {game?.state === State.LOBBY && (
          <input
            value={player.name}
            onChange={(e) => {
              player.name = e.currentTarget.value;
            }}
          />
        )}
        {player.party && <div>{player.party}</div>}
        {player.character && <div>{player.character}</div>}
      </div>
    </CardRow>
  );
});
