//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React, { FC, useEffect } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';
import { Space } from '@dxos/react-client/echo';

type Indicator = {
  id: string;
  title?: string;
  className?: string;
};

// TODO(burdon): Swarm (global scope)?
// TODO(burdon): Connected to vault (global scope)?
// TODO(burdon): Error handling (global scope)?
// TODO(burdon): Version out of date (global scope)?
// TODO(burdon): Make pluggable.
const defaultIndicators: Indicator[] = [
  {
    id: 'save',
  },
  {
    id: 'vault',
  },
  {
    id: 'network',
  },
  {
    id: 'error',
  },
];

export const SpaceStatus: FC<{ data: [string, Space] }> = () => {
  const [indicators, setIndicators] = React.useState<Indicator[]>(defaultIndicators);
  const updateIndicator = (id: string, value: Partial<Indicator>) => {
    setIndicators((indicators) =>
      indicators.map((indicator) => {
        if (indicator.id === id) {
          return Object.assign({}, indicator, value);
        }
        return indicator;
      }),
    );
  };

  // ({ data: [_, space] }}) => {
  // TODO(burdon): Get space object.
  const space: Space = undefined as any;
  useEffect(() => {
    // TODO(burdon): Simulate.
    setTimeout(() => {
      updateIndicator('save', { className: 'text-green-500' });
      setTimeout(() => {
        updateIndicator('save', { className: undefined });
      }, 500);
    }, 2000);
    setTimeout(() => {
      updateIndicator('error', {
        className: 'text-red-500 animate-pulse',
        title: new Error('timeout').message,
      });
    }, 3000);

    if (!space) {
      return;
    }

    // TODO(burdon): Async save.
    return space.db.pendingBatch.on((update) => {
      console.log('update', update);
    });
  }, []);

  const handleReset = (id: string) => {
    updateIndicator(id, { className: undefined, title: undefined });
  };

  return (
    <div className='flex p-2 gap-[2px]'>
      {indicators.map(({ id, title, className }) => (
        <div key={id} title={title} onClick={() => handleReset(id)}>
          <Circle weight='fill' className={mx('cursor-pointer text-neutral-200', className, getSize(3))} />
        </div>
      ))}
    </div>
  );
};
