//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';

type Indicator = {
  id: string;
  label: string;
  className?: string;
};

// TODO(burdon): Get space object.
export const SpaceStatus: FC<{}> = () => {
  // TODO(burdon): Async save.
  // TODO(burdon): Swarm.
  // TODO(burdon): Feed sync.
  // TODO(burdon): Connected to vault.
  // TODO(burdon): Error handling.
  // TODO(burdon): Version out of date.
  const indicators: Indicator[] = [
    {
      id: 'save',
      label: 'Saving...',
      className: 'text-green-400 animate-pulse',
    },
    {
      id: 'network',
      label: 'Error',
    },
    {
      id: 'error',
      label: 'Error',
      className: 'text-red-400 animate-pulse',
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
