//
// Copyright 2023 DXOS.org
//

import { Circle, type IconProps, Lightning, LightningSlash } from '@phosphor-icons/react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { getActiveSpace } from '@braneframe/plugin-space';
import { parseGraphPlugin, parseNavigationPlugin, useResolvePlugin, firstMainId } from '@dxos/app-framework';
import { TimeoutError } from '@dxos/async';
import { log } from '@dxos/log';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { getSize, mx } from '@dxos/react-ui-theme';

const styles = {
  success: 'text-sky-300 dark:text-green-700',
  warning: 'text-orange-300 dark:text-orange-600',
  error: 'text-red-300 dark:text-red-600',
};

// TODO(burdon): Move out of debug plugin.
// TODO(burdon): Make pluggable (move indicators to relevant plugins).
// TODO(burdon): Vault heartbeat indicator (global scope)?

/**
 * Ensure light doesn't flicker immediately after start.
 */
// TODO(burdon): Move to @dxos/async (debounce?)
const _timer = (cb: (err?: Error) => void, options?: { min?: number; max?: number }) => {
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

/**
 * Global error handler.
 */
// TODO(burdon): Integrate with Sentry?
const ErrorIndicator: FC<IconProps> = (props) => {
  const [, forceUpdate] = useState({});
  const errorRef = useRef<Error>();
  useEffect(() => {
    const errorListener = (event: any) => {
      const error: Error = event.error ?? event.reason;
      // event.preventDefault();
      if (errorRef.current !== error) {
        log.error('onError', { event });
        errorRef.current = error;
        forceUpdate({});
      }
    };

    // TODO(burdon): Register globally?
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event
    window.addEventListener('error', errorListener);

    // https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event
    window.addEventListener('unhandledrejection', errorListener);

    return () => {
      window.removeEventListener('error', errorListener);
      window.removeEventListener('unhandledrejection', errorListener);
    };
  }, []);

  const handleReset = () => {
    errorRef.current = undefined;
    forceUpdate({});
  };

  if (errorRef.current) {
    return (
      <span title={errorRef.current.message} onClick={handleReset}>
        <Circle weight='fill' className={mx(styles.error, getSize(3))} {...props} />
      </span>
    );
  } else {
    return (
      <span title='No errors.'>
        <Circle weight='fill' className={getSize(3)} {...props} />
      </span>
    );
  }
};

/**
 * Swarm connection handler.
 */
const SwarmIndicator: FC<IconProps> = (props) => {
  const [state, setState] = useState(0);
  const { swarm } = useNetworkStatus();
  useEffect(() => {
    setState(swarm === ConnectionState.ONLINE ? 0 : 1);
  }, [swarm]);

  if (state === 0) {
    return (
      <span title='Connected to swarm.'>
        <Lightning className={getSize(4)} {...props} />
      </span>
    );
  } else {
    return (
      <span title='Disconnected from swarm.'>
        <LightningSlash className={mx(styles.warning, getSize(4))} {...props} />
      </span>
    );
  }
};

/**
 * Space saving indicator.
 */
const SavingIndicator: FC<IconProps> = (props) => {
  const [state, _setState] = useState(0);
  const navigationPlugin = useResolvePlugin(parseNavigationPlugin);
  const graphPlugin = useResolvePlugin(parseGraphPlugin);
  const location = navigationPlugin?.provides.location;
  const graph = graphPlugin?.provides.graph;
  const _space = location && graph ? getActiveSpace(graph, firstMainId(location.active)) : undefined;
  // TODO(dmaretskyi): Fix this when we have save status for automerge.
  // useEffect(() => {
  //   if (!space) {
  //     return;
  //   }
  // const { start, stop } = timer(() => setState(0), { min: 250 });
  // return space.db.pendingBatch.on(({ duration, error }) => {
  //   if (error) {
  //     setState(2);
  //     stop();
  //   } else if (duration === undefined) {
  //     setState(1);
  //     start();
  //   } else {
  //     stop();
  //   }
  // });
  // }, [space]);

  switch (state) {
    case 2:
      return (
        <span title='Edit not saved.'>
          <Circle weight='fill' className={mx(styles.warning, getSize(3))} {...props} />
        </span>
      );
    case 1:
      return (
        <span title='Saving...'>
          <Circle weight='fill' className={mx(styles.success, getSize(3))} {...props} />
        </span>
      );
    case 0:
    default:
      return (
        <span title='Modified indicator.'>
          <Circle weight='fill' className={getSize(3)} {...props} />
        </span>
      );
  }
};

export const DebugStatus = () => {
  const indicators = [SavingIndicator, ErrorIndicator, SwarmIndicator];
  return (
    <div className='flex items-center px-1 gap-1 h-6 text-neutral-200 dark:text-neutral-800'>
      {indicators.map((Indicator) => (
        <Indicator key={Indicator.name} />
      ))}
    </div>
  );
};
