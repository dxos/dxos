//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React, { FC, useEffect } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';
import { Space } from '@dxos/react-client/echo';

type Indicator = {
  id: string;
  label: string;
  className?: string;
};

export const SpaceStatus: FC<{ data: [string, Space] }> = () => {
  // ({ data: [_, space] }}) => {
  // TODO(burdon): Get space object.
  const space: Space = undefined;
  useEffect(() => {
    if (!space) {
      return;
    }

    // TODO(burdon): Async save.
    return space.db.pendingBatch.on((update) => {
      console.log('update', update);
    });
  }, []);

  // TODO(burdon): Swarm.
  // TODO(burdon): Feed sync.
  // TODO(burdon): Connected to vault.
  // TODO(burdon): Error handling.
  // TODO(burdon): Version out of date.
  const indicators: Indicator[] = [
    {
      id: 'save',
      label: 'Saving...',
      // className: 'text-green-400 animate-pulse',
    },
    {
      id: 'vault',
      label: 'Vault',
    },
    {
      id: 'network',
      label: 'Network',
    },
    {
      id: 'error',
      label: 'Error',
      // className: 'text-red-400 animate-pulse',
    },
  ];

  const handleReset = (id: string) => {};

  return (
    <div className='flex gap-[2px]'>
      {indicators.map(({ id, label, className }) => (
        <div key={id} title={label} onClick={() => handleReset(id)}>
          <Circle weight='fill' className={mx('text-neutral-200', className, getSize(3))} />
        </div>
      ))}
    </div>
  );
};
