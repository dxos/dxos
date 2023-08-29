//
// Copyright 2023 DXOS.org
//

import { Circle, IconProps, WifiHigh, WifiSlash } from '@phosphor-icons/react';
import React, { FC, useEffect, useMemo, useState } from 'react';

import { SpacePluginProvides } from '@braneframe/plugin-space';
import { TimeoutError } from '@dxos/async';
import { getSize, mx } from '@dxos/aurora-theme';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { findPlugin, usePlugins } from '@dxos/react-surface';

const styles = {
  success: 'text-green-400 dark:text-green-600',
  warning: 'text-red-400 dark:text-red-600',
};

// TODO(burdon): Make pluggable.
// TODO(burdon): Connected to Swarm (global scope)?
// TODO(burdon): Vault heartbeat (global scope)?
// TODO(burdon): Error handling (global scope)?

// TODO(burdon): Move to @dxos/async.
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

const SwarmIndicator: FC<IconProps> = (props) => {
  const [state, setState] = useState(0);
  const { swarm } = useNetworkStatus();
  useEffect(() => {
    setState(swarm === ConnectionState.ONLINE ? 0 : 1);
  }, [swarm]);

  if (state === 0) {
    return <WifiHigh className={getSize(5)} {...props} />;
  } else {
    return <WifiSlash className={mx(styles.warning, getSize(5))} {...props} />;
  }
};

const SavingIndicator: FC<IconProps> = (props) => {
  const [state, setState] = useState(0);
  const { plugins } = usePlugins();
  const spacePlugin = findPlugin<SpacePluginProvides>(plugins, 'dxos.org/plugin/space');
  const space = spacePlugin?.provides.space.current;
  useEffect(() => {
    if (!space) {
      return;
    }
    const { start, stop } = timer((err) => setState(err ? 2 : 0), { min: 500, max: 2000 });
    return space.db.pendingBatch.on(({ duration }) => {
      if (duration === undefined) {
        setState(1);
        start();
      } else {
        stop();
      }
    });
  }, [space]);

  switch (state) {
    case 2:
      return <Circle weight='fill' className={mx(styles.warning, getSize(4))} {...props} />;
    case 1:
      return <Circle weight='fill' className={mx(styles.success, getSize(4))} {...props} />;
    case 0:
    default:
      return <Circle weight='fill' className={getSize(4)} {...props} />;
  }
};

export const DebugStatus: FC<{}> = () => {
  const indicators = useMemo(() => [SavingIndicator, SwarmIndicator], []);
  return (
    <div className='flex items-center p-2 gap-1 h-8 text-neutral-300 dark:text-neutral-700'>
      {indicators.map((Indicator) => (
        <Indicator key={Indicator.name} />
      ))}
    </div>
  );
};
