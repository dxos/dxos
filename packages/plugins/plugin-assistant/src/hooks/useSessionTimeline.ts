//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Duration from 'effect/Duration';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useEffect, useMemo, useState } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import { useOptionalCapability } from '@dxos/app-framework/ui';
import type * as Chat from '@dxos/assistant/Chat';
import type * as Process from '@dxos/compute/Process';
import { type Space } from '@dxos/react-client/echo';
import { type Task } from '@dxos/types';

import { type SessionTimeline, buildSessionTimeline } from '#session-timeline';

import { useTraceMessages } from './useTraceMessages.ts';

const atomEmpty = Atom.make(() => [] as const as readonly Process.Info[]);

/** How often `now` advances while a session is open, so a running lane's range keeps growing. */
const TICK_MS = 5_000;

export type UseSessionTimelineOptions = {
  /** The chats whose sessions are shown; each contributes a session lane and its checklist's task lanes. */
  chats: readonly Chat.Chat[];
  tasks?: readonly Task.Task[];
};

/**
 * The live gantt-shaped view of the given chats' sessions: rebuilt as trace events land on the
 * space's trace feed and as the process tree changes, and ticked so open lanes keep extending.
 */
export const useSessionTimeline = (
  space: Space | undefined,
  { chats, tasks }: UseSessionTimelineOptions,
): SessionTimeline => {
  const traceMessages = useTraceMessages(space);
  const monitor = useOptionalCapability(Capabilities.ProcessMonitor);
  const processes = useAtomValue(
    useMemo(() => monitor?.processTreeAtom.pipe(Atom.debounce(Duration.millis(500))) ?? atomEmpty, [monitor]),
  );

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return useMemo(
    () => buildSessionTimeline({ traceMessages, processes, chats, tasks, now }),
    [traceMessages, processes, chats, tasks, now],
  );
};
