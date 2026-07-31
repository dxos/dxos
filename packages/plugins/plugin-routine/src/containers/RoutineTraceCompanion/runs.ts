//
// Copyright 2026 DXOS.org
//

import { Trace } from '@dxos/compute';
import { type Obj, type Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

export type RunStatus = 'success' | 'failure' | 'pending';

export type RunEvent = {
  type: string;
  timestamp: number;
  data: unknown;
  /** Process id that emitted this event; present when a run spawns child processes. */
  pid?: string;
  /** Human-readable process name, if provided by the runtime. */
  processName?: string;
};

export type RoutineRun = {
  /** Root process id. */
  pid: string;
  startedAt: number;
  duration: number;
  status: RunStatus;
  /** All trace events for this run, sorted chronologically. */
  events: RunEvent[];
  /** Ref to the conversation (chat feed) created for this run, if any. */
  conversation?: Ref.Ref<Obj.Unknown>;
};

/**
 * Groups trace messages into per-run summaries.
 *
 * Only root processes (those whose `meta.parentPid` is absent) are considered
 * run entry points. Child processes contribute their events to the run duration
 * and outcome but do not create separate run entries.
 *
 * The triggerIds set identifies which messages belong to this routine.
 */
export const groupIntoRuns = (
  messages: readonly Trace.Message[],
  triggerEntityIds: ReadonlySet<string>,
): RoutineRun[] => {
  // Filter to messages whose trigger ref matches one of the routine's triggers.
  const relevant = messages.filter((msg) => {
    if (!msg.meta.trigger) {
      return false;
    }
    const eid = EID.getEntityId(EID.parse(msg.meta.trigger.uri));
    return eid !== undefined && triggerEntityIds.has(eid);
  });

  if (relevant.length === 0) {
    return [];
  }

  // Collect all pids and their parent relationships.
  const pidToParent = new Map<string, string>();
  for (const msg of relevant) {
    if (msg.meta.pid) {
      if (msg.meta.parentPid) {
        pidToParent.set(msg.meta.pid, msg.meta.parentPid);
      }
    }
  }

  // Find the root pid for a given pid (walk up the parent chain).
  const getRootPid = (pid: string): string => {
    let current = pid;
    const visited = new Set<string>();
    while (!visited.has(current)) {
      visited.add(current);
      const parent = pidToParent.get(current);
      if (!parent) {
        return current;
      }
      current = parent;
    }
    // Cycle detected; return a stable fallback key.
    return current;
  };

  // Group messages by root pid.
  const byRoot = new Map<string, Trace.Message[]>();
  for (const msg of relevant) {
    if (!msg.meta.pid) {
      continue;
    }
    const rootPid = getRootPid(msg.meta.pid);
    const group = byRoot.get(rootPid) ?? [];
    group.push(msg);
    byRoot.set(rootPid, group);
  }

  const runs: RoutineRun[] = [];
  for (const [pid, msgs] of byRoot) {
    const allEvents = msgs.flatMap((msg) => msg.events.map((evt) => ({ ...evt, meta: msg.meta })));
    allEvents.sort((left, right) => left.timestamp - right.timestamp);

    const startedAt = allEvents[0]?.timestamp ?? 0;
    const lastTimestamp = allEvents.at(-1)?.timestamp ?? startedAt;
    const duration = lastTimestamp - startedAt;

    // Determine status from OperationEnd events — failure beats success.
    let status: RunStatus = 'pending';
    for (const evt of allEvents) {
      if (Trace.isOfType(Trace.OperationEnd, evt)) {
        if (evt.data.outcome === 'failure') {
          status = 'failure';
          break;
        }
        status = 'success';
      }
    }

    // Grab the conversation ref from any message in this run that has one.
    const conversation = msgs.find((msg) => msg.meta.conversation)?.meta.conversation;

    const events: RunEvent[] = allEvents.map((evt) => ({
      type: evt.type,
      timestamp: evt.timestamp,
      data: evt.data,
      ...(evt.meta.pid && { pid: evt.meta.pid }),
      ...(evt.meta.processName && { processName: evt.meta.processName }),
    }));

    runs.push({ pid, startedAt, duration, status, events, conversation });
  }

  // Newest first.
  runs.sort((left, right) => right.startedAt - left.startedAt);
  return runs;
};
