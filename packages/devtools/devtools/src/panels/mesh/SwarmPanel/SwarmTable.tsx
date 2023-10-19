//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { Button } from '@dxos/react-ui';
import { type PublicKey } from '@dxos/keys';
import { type SwarmInfo } from '@dxos/protocols/proto/dxos/devtools/swarm';
import { humanize } from '@dxos/util';

import { BooleanIcon } from '../../../components';

export interface SwarmListProps {
  swarms: SwarmInfo[];
  onClick?: (id: PublicKey) => void;
}

// TODO(burdon): Convert to Table.
export const SwarmTable = ({ swarms, onClick }: SwarmListProps) => (
  <div className='flex flex-col grow h-screen w-full'>
    <div className='inline-flex w-full border-b border-slate-400 border-solid'>
      <div className='flex w-[400px]'>Label</div>
      <div className='flex w-[400px]'>Topic</div>
      <div className='flex w-[400px]'>Active</div>
      <div className='flex w-[400px]'>Info</div>
    </div>
    <div>
      {swarms.map((swarm) => (
        <div key={swarm.id.toHex()} className='inline-flex w-full border-b border-slate-200 border-solid'>
          <div className='flex w-[400px] overflow-hidden'>{swarm.label && humanize(swarm.label)}</div>
          <div className='flex w-[400px] overflow-hidden'>{humanize(swarm.topic)}</div>
          <div className='flex w-[400px] m-1'>
            <BooleanIcon value={swarm.isActive ? true : undefined} />
          </div>
          <div className='flex w-[400px] overflow-hidden '>
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
