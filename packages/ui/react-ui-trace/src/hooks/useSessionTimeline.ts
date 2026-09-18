//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import { useEffect, useMemo, useState } from 'react';

import type * as Process from '@dxos/compute/Process';
import { type Space } from '@dxos/react-client/echo';
import { type Task } from '@dxos/types';

import { type Session, type SessionTimeline, buildSessionTimeline } from '../session-timeline/index.ts';
import { useTraceMessages } from './useTraceMessages.ts';

/** How often `now` advances while a session is open, so a running lane's range keeps growing. */
const TICK_MS = 5_000;

// The trace feed emits continuously while anything runs, and every emission rebuilds the whole
// timeline from the full message history — so the rebuild rate is capped rather than the feed's.
const TRACE_DEBOUNCE = Duration.millis(500);

const NO_PROCESSES: readonly Process.Info[] = [];

export type UseSessionTimelineOptions = {
  /** The sessions shown; each contributes a session lane and its checklist's task lanes. */
  sessions: readonly Session[];
  tasks?: readonly Task.Task[];
  /** The live process tree, from whichever monitor the host has; without it a session's liveness is read from the trace alone. */
  processes?: readonly Process.Info[];
};

/**
 * The live gantt-shaped view of the given sessions: rebuilt as trace events land on the space's
 * trace feed and as the process tree changes, and ticked so open lanes keep extending.
 */
export const useSessionTimeline = (
  space: Space | undefined,
  { sessions, tasks, processes = NO_PROCESSES }: UseSessionTimelineOptions,
): SessionTimeline => {
  const traceMessages = useTraceMessages(space, { debounce: TRACE_DEBOUNCE });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return useMemo(
    () => buildSessionTimeline({ traceMessages, processes, sessions, tasks, now }),
    [traceMessages, processes, sessions, tasks, now],
  );
};
