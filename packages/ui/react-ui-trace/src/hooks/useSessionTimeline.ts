//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import { useEffect, useMemo, useRef, useState } from 'react';

import type * as Process from '@dxos/compute/Process';
import { Obj } from '@dxos/echo';
import { type Space } from '@dxos/react-client/echo';
import { type Task } from '@dxos/types';

import {
  type Session,
  type SessionTimeline,
  type TaskStatusChange,
  buildSessionTimeline,
  readTaskStatusChanges,
} from '../session-timeline/index.ts';
import { useTraceMessages } from './useTraceMessages.ts';

/** How often `now` advances while a session is open, so a running lane's range keeps growing. */
const TICK_MS = 5_000;

// The trace feed emits continuously while anything runs, and every emission rebuilds the whole
// timeline from the full message history — so the rebuild rate is capped rather than the feed's.
const TRACE_DEBOUNCE = Duration.millis(500);

const NO_PROCESSES: readonly Process.Info[] = [];

type StatusChangeCache = Map<string, { heads: string; changes: TaskStatusChange[] }>;

/**
 * A task's status moves, re-read only when its document has moved on: reading them diffs every change
 * in the document, and the timeline rebuilds on every trace emission and tick.
 */
const cachedStatusChanges = (cache: StatusChangeCache, task: Task.Task): TaskStatusChange[] => {
  const heads = (Obj.version(task).automergeHeads ?? []).join(',');
  const cached = cache.get(task.id);
  if (cached?.heads === heads) {
    return cached.changes;
  }
  const changes = readTaskStatusChanges(task);
  cache.set(task.id, { heads, changes });
  return changes;
};

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

  const statusChangeCache = useRef<StatusChangeCache>(new Map());
  return useMemo(() => {
    const taskStatusChanges = new Map(
      (tasks ?? []).map((task) => [task.id, cachedStatusChanges(statusChangeCache.current, task)]),
    );
    return buildSessionTimeline({ traceMessages, processes, sessions, tasks, taskStatusChanges, now });
  }, [traceMessages, processes, sessions, tasks, now]);
};
