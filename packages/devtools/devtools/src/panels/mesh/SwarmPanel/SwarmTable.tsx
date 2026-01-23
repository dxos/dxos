//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { type PublicKey } from '@dxos/keys';
import { type SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { Button } from '@dxos/react-ui';
import { humanize } from '@dxos/util';

import { BooleanIcon } from '../../../components';

export interface SwarmListProps {
  swarms: SwarmInfo[];
  onClick?: (id: PublicKey) => void;
}

// TODO(burdon): Convert to Table.
export const SwarmTable = ({ swarms, onClick }: SwarmListProps) => (
  <div className='flex flex-col grow bs-screen is-full'>
    <div className='inline-flex is-full border-b border-separator'>
      <div className='flex is-[30rem]'>Label</div>
      <div className='flex is-[30rem]'>Topic</div>
      <div className='flex is-[30rem]'>Active</div>
      <div className='flex is-[30rem]'>Info</div>
    </div>
    <div>
      {swarms.map((swarm) => (
        <div key={swarm.id.toHex()} className='inline-flex is-full border-b border-separator'>
          <div className='flex is-[30rem] overflow-hidden'>{swarm.label && humanize(swarm.label)}</div>
          <div className='flex is-[30rem] overflow-hidden'>{humanize(swarm.topic)}</div>
          <div className='flex is-[30rem] m-1'>
            <BooleanIcon value={swarm.isActive ? true : undefined} />
          </div>
          <div className='flex is-[30rem] overflow-hidden '>
            <Button
              onClick={() => {
                onClick?.(swarm.id);
              }}
            >
              Info
            </Button>
          </div>
        </div>
      ))}
    </div>
  </div>
);
