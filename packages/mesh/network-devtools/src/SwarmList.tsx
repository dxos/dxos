//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/crypto';
import { SwarmInfo } from '@dxos/network-manager';

export interface SwarmListProps {
  swarms: SwarmInfo[]
  onClick?: (id: PublicKey) => void
}

export const SwarmList = ({ swarms, onClick }: SwarmListProps) => (
  <div>
    {swarms.map(swarm => (
      <div key={swarm.id.toHex()} onClick={() => onClick?.(swarm.id)}>
        {swarm.label} {swarm.isActive ? 'JOINED' : 'LEFT'} {swarm.topic.toHex()}
      </div>
    ))}
  </div>
);
