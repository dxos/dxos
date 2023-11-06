//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { PublicKey } from '@dxos/keys';
import { Tooltip } from '@dxos/react-ui';

import '@dxosTheme';
import { ObjectPresence, type ObjectPresenceProps } from './SpacePresence';
import { type ObjectViewer } from '../types';

export default {
  component: ObjectPresence,
  actions: { argTypesRegex: '^on.*' },
};

const cursorColors = [
  { color: '#30bced', light: '#30bced33' },
  { color: '#6eeb83', light: '#6eeb8333' },
  { color: '#ffbc42', light: '#ffbc4233' },
  { color: '#ecd444', light: '#ecd44433' },
  { color: '#ee6352', light: '#ee635233' },
  { color: '#9ac2c9', light: '#9ac2c933' },
  { color: '#8acb88', light: '#8acb8833' },
  { color: '#1be7ff', light: '#1be7ff33' },
];

const randomColor = () => cursorColors[Math.round(Math.random() * cursorColors.length)]?.color;
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
