//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, {
  type PropsWithChildren,
  type Ref,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { formatElapsed } from './formatElapsed';

const SECOND = 1_000;
const TICK_MS = 500;

//
// Context
//

type StatusContextValue = {
  /** Wall-clock time (epoch ms). Updated every 500ms by Status.Root while running. */
  time: number;
};

const [StatusProvider, useStatusContext] = createContext<StatusContextValue>('Status');

export { useStatusContext };

//
// Controller
//

export type StatusController = {
  /** Resume the 2Hz tick. No-op if already running. */
  start: () => void;
  /** Pause the 2Hz tick. The reported `time` freezes at its last value. */
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
    const [time, setTime] = useState(() => Date.now());
    const [running, setRunning] = useState(defaultRunning);

    useEffect(() => {
      if (!running) {
        return;
      }
      let timeout: ReturnType<typeof setTimeout>;
      const tick = () => {
        const now = Date.now();
        setTime(now);
        timeout = setTimeout(tick, TICK_MS - (now % TICK_MS));
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
      <StatusProvider time={time}>
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
  /** Start time (epoch ms). Defaults to first-mount time. */
  start?: number;
}>;

/**
 * Elapsed-time display, driven by the Status.Root context tick (2Hz).
 * Re-mount or change the `start` prop to reset.
 */
const Stopwatch = ({ classNames, start: startProp }: StopwatchProps) => {
  const { time } = useStatusContext('Status.Stopwatch');
  const startRef = useRef<number>(startProp ?? time);
  const start = startProp ?? startRef.current;
  const elapsed = Math.max(0, time - start);
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
