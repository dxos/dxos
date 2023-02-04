//
// Copyright 2023 DXOS.org
//

import React, { useEffect } from 'react';

import { withReactor } from '@dxos/react-client';

import { Player, Policy, Round, RoundState, State } from '../proto';
import { PlayerCard } from './PlayerCard';
import { PlayersList } from './PlayersList';
import { Policies } from './Policies';
import { useGame, useUs } from './hooks';

export const RoundCard = withReactor(() => {
  const game = useGame()!;
  const round = game.rounds.at(-1)!;
  const us = useUs()!;

  return (
    <>
      {round.state === RoundState.NOMINATE_CHANCELLOR && <NominateChancellor />}
      {round.state === RoundState.ELECTION && <Election />}
      {round.state === RoundState.POLICY_PEEK && <PolicyPeek />}
      {round.state === RoundState.INVESTIGATE_LOYALTY && <INVESTIGATE_LOYALTY />}
      {round.state === RoundState.SPECIAL_ELECTION && <SPECIAL_ELECTION />}
      {round.state === RoundState.POLICY_PEAK && <POLICY_PEAK />}
      {round.state === RoundState.EXECUTION && <EXECUTION />}
    </>
  );
});
