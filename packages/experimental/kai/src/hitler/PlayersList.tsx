//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { id } from '@dxos/echo-schema';
import { withReactor } from '@dxos/react-client';
import { mx } from '@dxos/react-components';

import { Player } from '../proto';
import { useGame } from './hooks';

export const PlayersList = withReactor(
  ({ selected, onSelect }: { selected?: string; onSelect?: (player: Player) => void } = {}) => {
    const game = useGame();
    const president = game?.rounds.at(-1)?.president;
    const chancellor = game?.rounds.at(-1)?.chancellor;

    return (
      <div className='flex flex-row'>
        {game?.players.map((player) => (
          <div
            className={mx(
              player.memberKey === president?.memberKey && 'bg-yellow-700',
              player.memberKey === chancellor?.memberKey && 'bg-teal-700',
              player.memberKey === selected && 'bg-slate-400'
            )}
            key={player[id]}
            onClick={() => {
              onSelect?.(player);
            }}
          >
            {player.name}
          </div>
        ))}
      </div>
    );
  }
);
