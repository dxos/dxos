//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { id } from '@dxos/echo-schema';
import { withReactor } from '@dxos/react-client';

import { useGame } from './useGame';

export const PlayersList = withReactor(() => {
  const game = useGame();
  return (
    <div>
      {game?.players.map((player) => (
        <div key={player[id]}>{player.name}</div>
      ))}
    </div>
  );
});
