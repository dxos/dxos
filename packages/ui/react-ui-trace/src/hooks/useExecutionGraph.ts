//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Duration from 'effect/Duration';
import { pipe } from 'effect/Function';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { useEffect, useMemo, useState } from 'react';

import * as Process from '@dxos/compute/Process';
import { type Space } from '@dxos/react-client/echo';

import { filterProcessesBySelection, filterTraceMessages } from '../components/TracePanel/trace-filter.ts';
import { type ExecutionGraph, buildExecutionGraph } from '../execution-graph/index.ts';
import { getTraceMessagesAtom } from './useTraceMessages.ts';

// Stable refs.
const atomEmpty = Atom.make(() => [] as const);
const NO_PIDS: readonly string[] = [];

// How often the graph re-checks for spans that timed out with no closing event.
// Coarse-grained on purpose: `spanTimeoutMs` operates on a 20-minute scale, so there is no
// benefit to re-deriving the graph more often than this just to catch the timeout crossing.
const SPAN_TIMEOUT_CHECK_INTERVAL_MS = 60_000;

// The trace feed emits per message while anything runs, and the process monitor re-polls on its own
// clock; every emission rebuilds the graph from the whole history, so the rebuild rate is capped
// rather than either input's, as `useSessionTimeline` already does.
const REBUILD_DEBOUNCE = Duration.millis(500);

export type UseExecutionGraphOptions = {
  collapseCompletedSpans?: boolean;
  eventLimit?: number;
  /** Pids to narrow the graph to (with their descendants); empty shows everything. */
  selectedPids?: readonly string[];
};

/**
 * The commit graph of a space's trace, rebuilt as messages land and as the process tree changes.
 * `processesAtom` is the host's live process tree (a running agent draws a spinner commit); without
 * it the graph is the durable trace alone.
 */
export const useExecutionGraph = (
  space: Space,
  processesAtom: Atom.Atom<readonly Process.Info[]> | undefined,
  { collapseCompletedSpans, eventLimit, selectedPids = NO_PIDS }: UseExecutionGraphOptions = {},
): ExecutionGraph => {
  // Ticks periodically so spans that are still open purely because no new trace event has
  // arrived (e.g. the runtime crashed before writing its `operationEnd`) eventually get
  // force-closed by `buildExecutionGraph`'s `spanTimeoutMs` check, instead of staying stuck
  // until unrelated trace activity happens to trigger a recompute.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), SPAN_TIMEOUT_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const atom = useMemo(
    () =>
      getExecutionGraph(space, processesAtom ?? atomEmpty, { collapseCompletedSpans, eventLimit, selectedPids, now }),
    [space, processesAtom, collapseCompletedSpans, eventLimit, selectedPids, now],
  );

  return useAtomValue(atom);
};

/** Identity for the graph: only a process appearing, disappearing or changing state redraws it. */
const sameProcesses = (left: readonly Process.Info[], right: readonly Process.Info[]): boolean =>
  left.length === right.length &&
  left.every((process, index) => process.pid === right[index].pid && process.state === right[index].state);

const getExecutionGraph = (
  space: Space,
  processesAtom: Atom.Atom<readonly Process.Info[]>,
  {
    collapseCompletedSpans = true,
    eventLimit = 100,
    selectedPids = NO_PIDS,
    now,
  }: UseExecutionGraphOptions & { now: number },
): Atom.Atom<ExecutionGraph> => {
  const traceMessages = getTraceMessagesAtom(space).pipe(
    Atom.debounce(REBUILD_DEBOUNCE),
    Atom.map((messages) => filterTraceMessages(messages, selectedPids)),
  );

  const activeProcesses = pipe(
    processesAtom,
    Atom.debounce(REBUILD_DEBOUNCE),
    Atom.map((processes) =>
      filterProcessesBySelection(processes, selectedPids).filter(
        (process) => process.state === Process.State.RUNNING || process.state === Process.State.HYBERNATING,
      ),
    ),
    // The monitor rebuilds the process list on every poll, so without a structural comparison the
    // graph would be rebuilt on each tick even when nothing moved.
    Atom.withEquality(sameProcesses),
  );

  return Atom.make((get) =>
    buildExecutionGraph({
      traceMessages: get(traceMessages),
      activeProcesses: get(activeProcesses),
      collapseCompletedSpans,
      eventLimit,
      now,
    }),
  );
};
