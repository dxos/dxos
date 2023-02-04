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
  return null;
});
