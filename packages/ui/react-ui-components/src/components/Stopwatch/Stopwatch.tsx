//
// Copyright 2025 DXOS.org
//

import React, { type ReactNode, useEffect, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { formatElapsed } from './formatElapsed';

const SECOND = 1_000;

export type StopwatchProps = ThemedClassName<{
  /** Start time (epoch ms). Defaults to first-mount time. */
  start?: number;
  /** Animated icon. Defaults to a halo-pulse dot. */
  icon?: ReactNode;
  /** Optional trailing metadata (e.g. token counts). */
  meta?: ReactNode;
}>;

/**
 * Elapsed-time display with an animated icon and optional trailing metadata.
 * Pure display — re-mount or change the `start` prop to reset.
 */
export const Stopwatch = ({ classNames, start: startProp, icon, meta }: StopwatchProps) => {
  const [start] = useState(() => startProp ?? Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      const elapsed = Math.max(0, Date.now() - start);
      // Schedule the next tick aligned to the next whole-second boundary so
      // adjacent Stopwatches advance in lockstep and tab-throttling can't drift.
      timeout = setTimeout(tick, SECOND - (elapsed % SECOND));
    };

    timeout = setTimeout(tick, SECOND - (Math.max(0, Date.now() - start) % SECOND));
    return () => clearTimeout(timeout);
  }, [start]);

  const elapsed = Math.max(0, now - start);

  return (
    <span
      role='status'
      className={mx('inline-flex items-center gap-2 text-description font-mono tabular-nums', classNames)}
    >
      {icon ?? <DefaultIcon />}
      <span>{formatElapsed(elapsed)}</span>
      {meta != null && (
        <>
          <span aria-hidden='true' className='opacity-50'>
            ·
          </span>
          <span>{meta}</span>
        </>
      )}
    </span>
  );
};

const DefaultIcon = () => (
  <span aria-hidden='true' className='inline-block size-2 rounded-full bg-current animate-halo-pulse' />
);
