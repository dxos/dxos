//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, useEffect, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { formatElapsed } from './formatElapsed';

const SECOND = 1_000;

//
// Root
//

export type RootProps = ThemedClassName<PropsWithChildren>;

const Root = ({ classNames, children }: RootProps) => (
  <span
    role='status'
    className={mx('inline-flex items-center gap-2 text-description font-mono tabular-nums', classNames)}
  >
    {children}
  </span>
);

//
// Icon
//

export type IconProps = ThemedClassName<PropsWithChildren>;

/**
 * Animated leading indicator. Defaults to a halo-pulse dot. Pass children to override.
 */
const Icon = ({ classNames, children }: IconProps) => {
  if (children !== undefined) {
    return <>{children}</>;
  }
  return (
    <span
      aria-hidden='true'
      className={mx('inline-block size-2 rounded-full bg-current animate-halo-pulse', classNames)}
    />
  );
};

//
// Stopwatch
//

export type StopwatchProps = ThemedClassName<{
  /** Start time (epoch ms). Defaults to first-mount time. */
  start?: number;
}>;

/**
 * Elapsed-time display. Ticks at 1Hz aligned to the next whole-second boundary
 * so adjacent Stopwatch instances advance in lockstep.
 * Re-mount or change the `start` prop to reset.
 */
const Stopwatch = ({ classNames, start: startProp }: StopwatchProps) => {
  const [start] = useState(() => startProp ?? Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      setNow(Date.now());
      const elapsed = Math.max(0, Date.now() - start);
      timeout = setTimeout(tick, SECOND - (elapsed % SECOND));
    };

    timeout = setTimeout(tick, SECOND - (Math.max(0, Date.now() - start) % SECOND));
    return () => clearTimeout(timeout);
  }, [start]);

  const elapsed = Math.max(0, now - start);

  return <span className={mx(classNames)}>{formatElapsed(elapsed)}</span>;
};

//
// Separator
//

export type SeparatorProps = ThemedClassName<unknown>;

/**
 * Middle-dot separator. Decorative — `aria-hidden`.
 */
const Separator = ({ classNames }: SeparatorProps) => (
  <span aria-hidden='true' className={mx('opacity-50', classNames)}>
    ·
  </span>
);

//
// Text
//

export type TextProps = ThemedClassName<PropsWithChildren>;

/**
 * Generic text node — useful for token counts and other inline metadata.
 */
const Text = ({ classNames, children }: TextProps) => <span className={mx(classNames)}>{children}</span>;

//
// Status
//

export const Status = {
  Root,
  Icon,
  Stopwatch,
  Separator,
  Text,
};
