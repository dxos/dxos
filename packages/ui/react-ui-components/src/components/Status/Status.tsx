//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, type Ref, forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { formatElapsed } from './formatElapsed';

const TICK_MS = 1_000;

//
// Context
//

type StatusContextValue = {
  /** Whole seconds elapsed since Status.Root mounted. Only advances while `running` is true. */
  elapsed: number;
  /** Whether the Status.Root tick is currently active. Toggled via the StatusController. */
  running: boolean;
};

const [StatusProvider, useStatusContext] = createContext<StatusContextValue>('Status');

export { useStatusContext };

//
// Controller
//

export type StatusController = {
  /** Resume the tick. No-op if already running. */
  start: () => void;
  /** Pause the tick. The reported `time` freezes at its last value. */
  stop: () => void;
};

//
// Root
//

export type RootProps = ThemedClassName<
  PropsWithChildren<{
    /** Whether the tick starts running on mount. Defaults to `true`. */
    defaultRunning?: boolean;
  }>
>;

const Root = forwardRef<StatusController, RootProps>(
  ({ classNames, children, defaultRunning = true }: RootProps, forwardedRef: Ref<StatusController>) => {
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(defaultRunning);

    useEffect(() => {
      if (!running) {
        return;
      }

      let timeout: ReturnType<typeof setTimeout>;
      const tick = () => {
        setElapsed((e) => e + 1);
        timeout = setTimeout(tick, TICK_MS - (Date.now() % TICK_MS));
      };
      timeout = setTimeout(tick, TICK_MS - (Date.now() % TICK_MS));
      return () => clearTimeout(timeout);
    }, [running]);

    useImperativeHandle(
      forwardedRef,
      () => ({
        start: () => setRunning(true),
        stop: () => setRunning(false),
      }),
      [],
    );

    return (
      <StatusProvider elapsed={elapsed} running={running}>
        <span
          role='status'
          className={mx('inline-flex items-center gap-2 text-description font-mono tabular-nums', classNames)}
        >
          {children}
        </span>
      </StatusProvider>
    );
  },
);

Root.displayName = 'Status.Root';

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
  /** Seconds to add to the context elapsed value before formatting. Defaults to 0. */
  offset?: number;
}>;

/**
 * Elapsed-time display, driven by the Status.Root context tick.
 * Re-mount or change `offset` to reset.
 */
const Stopwatch = ({ classNames, offset = 0 }: StopwatchProps) => {
  const { elapsed } = useStatusContext('Status.Stopwatch');
  return <span className={mx(classNames)}>{formatElapsed((elapsed + offset) * 1_000)}</span>;
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
