//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { useActiveSpace } from '@dxos/app-toolkit/ui';
import { TimeoutError } from '@dxos/async';
import { StatusBar } from '@dxos/plugin-status-bar';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { useNetworkStatus } from '@dxos/react-client/mesh';
import { IconButton } from '@dxos/react-ui';

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
const ErrorIndicator = () => {
  const [, forceUpdate] = useState({});
  const errorRef = useRef<Error>(null);
  useEffect(() => {
    const errorListener = (event: any) => {
      const error: Error = event.error ?? event.reason;
      if (errorRef.current !== error) {
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
    errorRef.current = null;
    forceUpdate({});
  };

  if (errorRef.current) {
    return (
      <StatusBar.Item>
        <IconButton
          icon='ph--warning-circle--duotone'
          iconOnly
          label={errorRef.current.message}
          classNames={styles.error}
          onClick={handleReset}
        />
      </StatusBar.Item>
    );
  } else {
    return (
      <StatusBar.Item>
        <IconButton variant='ghost' icon='ph--check--regular' iconOnly label='No errors.' />
      </StatusBar.Item>
    );
  }
};

/**
 * Swarm connection handler.
 */
const SwarmIndicator = () => {
  const [state, setState] = useState(0);
  const { swarm } = useNetworkStatus();
  useEffect(() => {
    setState(swarm === ConnectionState.ONLINE ? 0 : 1);
  }, [swarm]);

  if (state === 0) {
    return (
      <StatusBar.Item>
        <IconButton variant='ghost' icon='ph--lightning--regular' iconOnly label='Connected to swarm.' />
      </StatusBar.Item>
    );
  } else {
    return (
      <StatusBar.Item>
        <IconButton
          variant='ghost'
          icon='ph--lightning-slash--regular'
          iconOnly
          label='Disconnected from swarm.'
          classNames={styles.warning}
        />
      </StatusBar.Item>
    );
  }
};

/**
 * Data saving indicator.
 */
// TODO(burdon): Merge with SaveStatus.
const SavingIndicator = () => {
  const [state, _setState] = useState(0);
  const _space = useActiveSpace();
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
        <StatusBar.Item>
          <IconButton
            variant='ghost'
            icon='ph--circle--duotone'
            iconOnly
            label='Edit not saved.'
            classNames={styles.warning}
          />
        </StatusBar.Item>
      );
    case 1:
      return (
        <StatusBar.Item>
          <IconButton
            variant='ghost'
            icon='ph--circle--duotone'
            iconOnly
            label='Saving...'
            classNames={styles.success}
          />
        </StatusBar.Item>
      );
    case 0:
    default:
      return (
        <StatusBar.Item>
          <IconButton variant='ghost' icon='ph--circle--duotone' iconOnly label='Modified indicator.' />
        </StatusBar.Item>
      );
  }
};

const indicators = [SavingIndicator, SwarmIndicator, ErrorIndicator];

export const DebugStatus = () => {
  return (
    <>
      {indicators.map((Indicator) => (
        <Indicator key={Indicator.name} />
      ))}
    </>
  );
};
