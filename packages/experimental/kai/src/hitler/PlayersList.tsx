//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { id } from '@dxos/echo-schema';
import { withReactor } from '@dxos/react-client';

import { useGame } from './hooks';
import { mx } from '@dxos/react-components';

export const PlayersList = withReactor(({ selected, onClick }: { selected?: string; onClick?: () => void } = {}) => {
  const game = useGame();
  const president = game?.rounds.at(-1)?.president;
  const chancellor = game?.rounds.at(-1)?.chancellor;

  return (
    <div>
      {game?.players.map((player) => (
        <div
          className={mx(
            player.memberKey === president?.memberKey && 'bg-yellow-700',
            player.memberKey === chancellor?.memberKey && 'bg-teal-700'
          )}
          key={player[id]}
        >
          {player.name}
        </div>
      ))}
    </div>
  );
});
