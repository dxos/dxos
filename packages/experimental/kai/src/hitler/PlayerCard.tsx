//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { withReactor } from '@dxos/react-client';

import { State, Player } from '../proto';
import { useGame } from './hooks';

export const PlayerCard = withReactor(({ player }: { player: Player }) => {
  const game = useGame();
  return (
    <div className='w-[300px] bg-slate-200'>
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
  );
});
