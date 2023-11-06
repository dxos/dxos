//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Tooltip } from '@dxos/react-ui';

import '@dxosTheme';
import { ObjectPresence, type ObjectPresenceProps } from './SpacePresence';

import { PublicKey } from '@dxos/keys';

import { type ObjectViewer } from '../types';

export default {
  component: ObjectPresence,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: ObjectPresenceProps) => {
  const p: ObjectPresenceProps = {
    onShareClick: () => console.log('onShareClick'),
    ...props,
  };
  const nViewers = (n: number): ObjectViewer[] =>
    Array.from({ length: n }, () => ({
      identityKey: PublicKey.random(),
      spaceKey: PublicKey.random(),
      objectId: 'cafebabe',
      lastSeen: Date.now(),
    }));
  return (
    <Tooltip.Provider>
      <div className='bg-cubes p-4'>
        <div className='p-3'>
          <ObjectPresence {...p} />
        </div>
        <div className='p-3'>
          <ObjectPresence viewers={nViewers(1)} {...p} />
        </div>
        <div className='p-3'>
          <ObjectPresence viewers={nViewers(2)} {...p} />
        </div>
        <div className='p-3'>
          <ObjectPresence viewers={nViewers(3)} {...p} />
        </div>
        <div className='p-3'>
          <ObjectPresence viewers={nViewers(4)} {...p} />
        </div>
        <div className='p-3'>
          <ObjectPresence viewers={nViewers(5)} {...p} />
        </div>
        <div className='p-3'>
          <ObjectPresence viewers={nViewers(10)} {...p} />
        </div>
        <div className='p-3'>
          <ObjectPresence viewers={nViewers(100)} {...p} />
        </div>
      </div>
    </Tooltip.Provider>
  );
};
