//
// Copyright 2023 DXOS.org
//

import { Circle, ChartBar, Lightning, LightningSlash } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { getActiveSpace } from '@braneframe/plugin-space';
import { StatusBar } from '@braneframe/plugin-status-bar';
import { parseGraphPlugin, parseNavigationPlugin, useResolvePlugin, firstMainId } from '@dxos/app-framework';
import { TimeoutError } from '@dxos/async';
import { StatsPanel, useStats } from '@dxos/devtools';
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
const ErrorIndicator = () => {
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
      <StatusBar.Button title={errorRef.current.message} onClick={handleReset}>
        <Circle weight='fill' className={mx(styles.error, getSize(3))} />
      </StatusBar.Button>
    );
  } else {
    return (
      <StatusBar.Item title='No errors.'>
        <Circle weight='fill' className={getSize(3)} />
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
      <StatusBar.Item title='Connected to swarm.'>
        <Lightning className={getSize(4)} />
      </StatusBar.Item>
    );
  } else {
    return (
      <StatusBar.Item title='Disconnected from swarm.'>
        <LightningSlash className={mx(styles.warning, getSize(4))} />
      </StatusBar.Item>
    );
  }
};

/**
 * Space saving indicator.
 */
const SavingIndicator = () => {
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
        <StatusBar.Item title='Edit not saved.'>
          <Circle weight='fill' className={mx(styles.warning, getSize(3))} />
        </StatusBar.Item>
      );
    case 1:
      return (
        <StatusBar.Item title='Saving...'>
          <Circle weight='fill' className={mx(styles.success, getSize(3))} />
        </StatusBar.Item>
      );
    case 0:
    default:
      return (
        <StatusBar.Item title='Modified indicator.'>
          <Circle weight='fill' className={getSize(3)} />
        </StatusBar.Item>
      );
  }
};

const PerformanceIndicator = () => {
  const [visible, setVisible] = useState(false);
  const [stats, refreshStats] = useStats();

  return (
    <>
      <StatusBar.Button onClick={() => setVisible((visible) => !visible)} title='Performance panels'>
        <ChartBar />
      </StatusBar.Button>
      <div
        className={mx(
          'z-20 absolute transition-[right] bottom-[40px] w-[450px]',
          'border-l border-y border-neutral-300 dark:border-neutral-700',
          visible ? 'right-0' : 'right-[-450px]',
        )}
      >
        <StatsPanel stats={stats} onRefresh={refreshStats} />
      </div>
    </>
  );
};

const indicators = [PerformanceIndicator, SavingIndicator, ErrorIndicator, SwarmIndicator];

export const DebugStatus = () => {
  return (
    <>
      {indicators.map((Indicator) => (
        <Indicator key={Indicator.name} />
      ))}
    </>
  );
};
