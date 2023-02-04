//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { withReactor } from '@dxos/react-client';
import { range } from '@dxos/util';

import { Policy } from '../proto';
import { useGame } from './hooks';

export const Policies = withReactor(() => {
  const game = useGame();
  const numFascist = game?.policies.filter((policy) => policy.policy === Policy.FASCIST_POLICY).length ?? 0;
  const numLiberal = game?.policies.filter((policy) => policy.policy === Policy.LIBERAL_POLICY).length ?? 0;

  return (
    <div className='flex flex-col'>
      <div className='flex flex-row'>
        {range(numFascist).map((i) => (
          <div key={i}>F</div>
        ))}
      </div>
      <div className='flex flex-row'>
        {range(numLiberal).map((i) => (
          <div key={i}>L</div>
        ))}
      </div>
    </div>
  );
});
