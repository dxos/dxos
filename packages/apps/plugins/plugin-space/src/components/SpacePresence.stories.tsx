//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { PublicKey } from '@dxos/keys';
import { Tooltip } from '@dxos/react-ui';
import { getColorForValue } from '@dxos/react-ui-theme';

import { ObjectPresence, type ObjectPresenceProps } from './SpacePresence';
import { type ObjectViewer } from '../types';

export default {
  component: ObjectPresence,
  actions: { argTypesRegex: '^on.*' },
};

const randomColor = () => getColorForValue({ type: 'color', value: Math.random().toString(16) });
const nViewers = (n: number): ObjectViewer[] =>
  Array.from({ length: n }, () => ({
    identityKey: PublicKey.random(),
    spaceKey: PublicKey.random(),
    objectId: 'cafebabe',
    lastSeen: Date.now(),
    color: randomColor(),
  }));

export const Normal = (props: ObjectPresenceProps) => {
  const p: ObjectPresenceProps = {
    onShareClick: () => console.log('onShareClick'),
    ...props,
  };

  return (
    <Tooltip.Provider>
      <div className='p-4'>
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

export const SmallPresence = (props: ObjectPresenceProps) => {
  const p: ObjectPresenceProps = {
    size: 2,
  };
  return (
    <Tooltip.Provider>
      <div className='p-4'>
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
      </div>
    </Tooltip.Provider>
  );
};
