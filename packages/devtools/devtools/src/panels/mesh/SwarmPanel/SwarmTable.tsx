//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { type PublicKey } from '@dxos/keys';
import { toPublicKey } from '@dxos/protocols/buf';
import { type SwarmInfo } from '@dxos/protocols/buf/dxos/devtools/swarm_pb';
import { Button } from '@dxos/react-ui';
import { humanize } from '@dxos/util';

import { BooleanIcon } from '../../../components';

export interface SwarmListProps {
  swarms: SwarmInfo[];
  onClick?: (id: PublicKey) => void;
}

// TODO(burdon): Convert to Table.
export const SwarmTable = ({ swarms, onClick }: SwarmListProps) => (
  <div className='flex flex-col grow h-screen w-full'>
    <div className='inline-flex w-full border-b border-separator'>
      <div className='flex w-[30rem]'>Label</div>
      <div className='flex w-[30rem]'>Topic</div>
      <div className='flex w-[30rem]'>Active</div>
      <div className='flex w-[30rem]'>Info</div>
    </div>
    <div>
      {swarms.map((swarm) => (
        <div
          key={swarm.id ? toPublicKey(swarm.id).toHex() : ''}
          className='inline-flex w-full border-b border-separator'
        >
          <div className='flex w-[30rem] overflow-hidden'>{swarm.label && humanize(swarm.label)}</div>
          <div className='flex w-[30rem] overflow-hidden'>{swarm.topic ? humanize(toPublicKey(swarm.topic)) : ''}</div>
          <div className='flex w-[30rem] m-1'>
            <BooleanIcon value={swarm.isActive ? true : undefined} />
          </div>
          <div className='flex w-[30rem] overflow-hidden '>
            <Button
              onClick={() => {
                swarm.id && onClick?.(toPublicKey(swarm.id));
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
