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
  <div className='flex h-screen w-full grow flex-col'>
    <div className='inline-flex w-full border-b border-solid border-slate-400'>
      <div className='flex w-[400px]'>Label</div>
      <div className='flex w-[400px]'>Topic</div>
      <div className='flex w-[400px]'>Active</div>
      <div className='flex w-[400px]'>Info</div>
    </div>
    <div>
      {swarms.map((swarm) => (
        <div key={swarm.id.toHex()} className='inline-flex w-full border-b border-solid border-slate-200'>
          <div className='flex w-[400px] overflow-hidden'>{swarm.label && humanize(swarm.label)}</div>
          <div className='flex w-[400px] overflow-hidden'>{humanize(swarm.topic)}</div>
          <div className='m-1 flex w-[400px]'>
            <BooleanIcon value={swarm.isActive ? true : undefined} />
          </div>
          <div className='flex w-[400px] overflow-hidden'>
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
