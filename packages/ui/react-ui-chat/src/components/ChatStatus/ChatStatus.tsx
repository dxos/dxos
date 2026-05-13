//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, type Ref, forwardRef, useEffect, useImperativeHandle, useState } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { formatElapsed } from './format';

const TICK_MS = 1_000;

//
// Context
//

type ChatStatusContextValue = {
  /** Whole seconds elapsed since ChatStatus.Root mounted. Only advances while `running` is true. */
  elapsed: number;
  /** Whether the ChatStatus.Root tick is currently active. Toggled via the ChatStatusController. */
  running: boolean;
};

const [ChatStatusProvider, useChatStatusContext] = createContext<ChatStatusContextValue>('ChatStatus');

export { useChatStatusContext };

//
// Controller
//

export type ChatStatusController = {
  /** Resume the tick. No-op if already running. */
  start: () => void;
  /** Pause the tick. The reported `elapsed` freezes at its last value. */
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

const Root = forwardRef<ChatStatusController, RootProps>(
  ({ classNames, children, defaultRunning = true }: RootProps, forwardedRef: Ref<ChatStatusController>) => {
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(defaultRunning);

    useEffect(() => {
      if (!running) {
        return;
      }

      // Anchor to a wall-clock timestamp so `elapsed` self-corrects after
      // tab-throttling: browsers clamp setTimeout to >=1s in inactive tabs
      // and >=1min when the page is hidden, so a count-the-ticks approach
      // would under-report after a background period. Computing elapsed from
      // (Date.now() - startedAt) restores the true wall-clock value on the
      // next fired tick. The initial elapsed (preserved across stop/start)
      // is folded into the anchor so paused intervals are excluded.
      const startedAt = Date.now() - elapsed * TICK_MS;
      let timeout: ReturnType<typeof setTimeout>;
      const tick = () => {
        setElapsed(Math.floor((Date.now() - startedAt) / TICK_MS));
        timeout = setTimeout(tick, TICK_MS - (Date.now() % TICK_MS));
      };
      timeout = setTimeout(tick, TICK_MS - (Date.now() % TICK_MS));
      return () => clearTimeout(timeout);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- `elapsed` is
      // captured once at resume; depending on it would restart the timer on
      // every tick.
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
      <ChatStatusProvider elapsed={elapsed} running={running}>
        <span className={mx('inline-flex items-center gap-2 text-description font-mono tabular-nums', classNames)}>
          {children}
        </span>
      </ChatStatusProvider>
    );
  },
);

Root.displayName = 'ChatChatStatus.Root';

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
 * Elapsed-time display, driven by the ChatStatus.Root context tick.
 * Use `offset` to shift the displayed value; remount `ChatStatus.Root` to reset the underlying counter.
 * Marked `aria-live='off'` so screen readers don't announce every tick.
 */
const Stopwatch = ({ classNames, offset = 0 }: StopwatchProps) => {
  const { elapsed } = useChatStatusContext('ChatChatStatus.Stopwatch');
  return (
    <span aria-live='off' className={mx(classNames)}>
      {formatElapsed((elapsed + offset) * 1_000)}
    </span>
  );
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
// ChatStatus
//

export const ChatStatus = {
  Root,
  Icon,
  Stopwatch,
  Separator,
  Text,
};
