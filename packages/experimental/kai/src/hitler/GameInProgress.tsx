//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { useIdentity, withReactor } from '@dxos/react-client';

import { Policy, State } from '../proto';
import { PlayerCard } from './PlayerCard';
import { PlayersList } from './PlayersList';
import { Policies } from './Policies';
import { useGame } from './useGame';

export const GameInProgress = withReactor(() => {
  const game = useGame()!;

  const checkWin = () => {
    if (game.policies.filter((policy) => policy.policy === Policy.FASCIST_POLICY).length === 6) {
      game.state = State.FASCISTS_WON;
    } else if (game.policies.filter((policy) => policy.policy === Policy.LIBERAL_POLICY)) {
      game.state = State.LIBERALS_WON;
    }
  };

  const { identityKey } = useIdentity()!;

  const us = game.players.find((player) => player.memberKey === identityKey.toHex())!;
  return (
    <div>
      <div>
        <PlayerCard player={us} />
        <PlayersList />
      </div>

      <Policies />
    </div>
  );
});
