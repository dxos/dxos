//
// Copyright 2023 DXOS.org
//

import { Circle } from '@phosphor-icons/react';
import React, { FC, useEffect } from 'react';

import { TimeoutError } from '@dxos/async';
import { getSize, mx } from '@dxos/aurora-theme';
import { findPlugin, usePlugins } from '@dxos/react-surface';

import { SpacePluginProvides } from '../types';

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
  // {
  //   id: 'vault',
  // },
  // {
  //   id: 'network',
  // },
  // {
  //   id: 'error',
  // },
];

// TODO(burdon): Timeout.
const timer = (cb: (err?: Error) => void, options?: { min?: number; max?: number }) => {
  const min = options?.min ?? 500;
  let start: number;
  let pending: NodeJS.Timeout;
  let timeout: NodeJS.Timeout;
  return {
    start: () => {
      start = Date.now();
      clearTimeout(pending);
      if (options?.max) {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          cb(new TimeoutError(options.max));
        }, options.max);
      }
    },
    stop: () => {
      clearTimeout(timeout);
      const delta = Date.now() - start;
      if (delta < min) {
        pending = setTimeout(() => {
          cb();
        }, min - delta);
      }
    },
  };
};

const styles = {
  success: 'text-green-400 dark:text-green-600',
  warning: 'text-red-400 dark:text-red-600',
};

export const SpaceStatus: FC<{ data: any }> = ({ data }) => {
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides.space.current;

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

  useEffect(() => {
    if (!space) {
      return;
    }
    const { start, stop } = timer((err) => updateIndicator('save', { className: err ? styles.warning : undefined }), {
      min: 500,
      max: 2000,
    });
    return space.db.pendingBatch.on(({ duration }) => {
      if (duration === undefined) {
        updateIndicator('save', { className: styles.success });
        start();
      } else {
        stop();
      }
    });
  }, [space]);

  const handleReset = (id: string) => {
    updateIndicator(id, { className: undefined, title: undefined });
  };

  return (
    <div className='flex items-center p-2 gap-[2px] h-8'>
      {indicators.map(({ id, title, className }) => (
        <div key={id} title={title} onClick={() => handleReset(id)}>
          <Circle
            weight='fill'
            className={mx('cursor-pointer', className ?? 'text-neutral-200 dark:text-neutral-700', getSize(3))}
          />
        </div>
      ))}
    </div>
  );
};
