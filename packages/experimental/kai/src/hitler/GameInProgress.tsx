//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import { withReactor } from '@dxos/react-client';

import { Election, Player, Round, RoundState } from '../proto';
import { PlayerCard } from './PlayerCard';
import { PlayersList } from './PlayersList';
import { Policies } from './Policies';
import { RoundCard } from './RoundCard';
import { useGame, useUs } from './hooks';

export const GameInProgress = withReactor(() => {
  const game = useGame()!;
  const us = useUs()!;

  const selectNewPresident = (): Player => {
    const lastPresident = game.rounds.at(-1)?.president;
    if (lastPresident) {
      // Return the next player in the list.
      const index = game.players.findIndex((player) => player.memberKey === lastPresident.memberKey);
      return game.players.at((index + 1) % game.players.length)!;
    } else {
      // Return a random player.
      return game.players[Math.floor(Math.random() * game.players.length)];
    }
  };

  useEffect(() => {
    if (game.rounds.length === 0 || game.rounds.at(-1)?.state === RoundState.END_ROUND) {
      game.rounds.push(
        new Round({
          state: RoundState.NOMINATE_CHANCELLOR,
          president: selectNewPresident(),
          election: new Election()
        })
      );
    }
  }, [game.rounds.length]);

  return (
    <div>
      <Policies />
      <div className='flex flex-row'>
        <div className='flex flex-shrink'>
          <PlayerCard player={us} />
        </div>
        <div className='flex flex-1'>
          <PlayersList />
        </div>
      </div>

      <RoundCard />
    </div>
  );
});
