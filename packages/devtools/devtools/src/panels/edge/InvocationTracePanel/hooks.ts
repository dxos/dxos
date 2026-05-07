//
// Copyright 2025 DXOS.org
//

import { useCallback, useEffect, useMemo, useState } from 'react';

import { Operation, Script, Trace } from '@dxos/compute';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { FeedTraceSink } from '@dxos/functions-runtime';
import { type DXN } from '@dxos/keys';
import { useQuery } from '@dxos/react-client/echo';

/**
 * UI-only view over invocation telemetry, reconstructed from `Trace.Message`s in the
 * per-space trace feed by pairing `OperationStart` + `OperationEnd` events that share
 * a `meta.pid`. `outcome === undefined` means the invocation is still in progress.
 *
 * Local to this panel — not exported from `@dxos/compute`. Consumers outside the panel
 * fold the trace stream themselves.
 */
export type InvocationSpan = {
  pid: string;
  parentPid?: string;
  timestamp: number;
  duration: number;
  outcome?: Trace.OperationOutcome;
  key?: string;
  name?: string;
  input?: unknown;
  runtime?: Trace.PayloadType<typeof Trace.OperationStart>['runtime'];
  error?: string;
};

const buildInvocationSpans = (messages: readonly Trace.Message[]): InvocationSpan[] => {
  if (messages.length === 0) {
    return [];
  }
  type Entry = {
    parentPid?: string;
    start?: { timestamp: number; data: Trace.PayloadType<typeof Trace.OperationStart> };
    end?: { timestamp: number; data: Trace.PayloadType<typeof Trace.OperationEnd> };
  };
  const byPid = new Map<string, Entry>();
  for (const message of messages) {
    const pid = message.meta.pid;
    if (!pid) {
      continue;
    }
    let entry = byPid.get(pid);
    if (!entry) {
      entry = { parentPid: message.meta.parentPid };
      byPid.set(pid, entry);
    }
    for (const event of message.events) {
      if (Trace.isOfType(Trace.OperationStart, event)) {
        entry.start = { timestamp: event.timestamp, data: event.data };
      } else if (Trace.isOfType(Trace.OperationEnd, event)) {
        entry.end = { timestamp: event.timestamp, data: event.data };
      }
    }
  }
  const now = Date.now();
  const spans: InvocationSpan[] = [];
  for (const [pid, { parentPid, start, end }] of byPid.entries()) {
    if (!start) {
      continue;
    }
    spans.push({
      pid,
      parentPid,
      timestamp: start.timestamp,
      duration: end ? end.timestamp - start.timestamp : now - start.timestamp,
      outcome: end?.data.outcome,
      key: start.data.key,
      name: start.data.name ?? end?.data.name,
      input: start.data.input,
      runtime: start.data.runtime,
      error: end?.data.error,
    });
  }
  return spans;
};

/**
 * Maps invocation target identifiers to readable script names.
 *
 * The new trace model only records `OperationStart.key` per invocation; this hook
 * resolves a key to a `PersistentOperation`'s display name. Accepts a `DXN` for
 * backwards compatibility (extracts the trailing UUID segment).
 */
export const useFunctionNameResolver = ({ db }: { db?: Database.Database }) => {
  const functions = useQuery(db, Filter.type(Operation.PersistentOperation));

  return useCallback(
    (key: string | DXN | undefined) => {
      if (!key) {
        return undefined;
      }
      const lookupKey = typeof key === 'string' ? key : key.toString().split(':').pop();
      return functions.find((fn) => fn.key === lookupKey)?.name;
    },
    [functions],
  );
};

/**
 * For a Script target, returns the set of `OperationStart.key`s of the persistent
 * operations bound to it. Returns `undefined` for non-Script targets so callers
 * can fall back to per-target filtering.
 */
export const useInvocationTargetsForScript = (target: Obj.Unknown | undefined) => {
  const db = Obj.instanceOf(Script.Script, target) ? Obj.getDatabase(target) : undefined;
  const functions = useQuery(db, Filter.type(Operation.PersistentOperation));

  return useMemo(() => {
    if (!Obj.instanceOf(Script.Script, target)) {
      return undefined;
    }

    return new Set(
      functions
        .filter((fn) => fn.source?.target?.id === target.id)
        .map((fn) => fn.key)
        .filter((key): key is string => typeof key === 'string'),
    );
  }, [functions, target]);
};

/**
 * Loads `Trace.Message`s from the per-space trace feed (`dxos.org.feed.trace`),
 * folds them into invocation spans, and optionally filters by target.
 */
export const useInvocationSpans = ({ db, target }: { db?: Database.Database; target?: Obj.Unknown }) => {
  const functionsForScript = useInvocationTargetsForScript(target);

  const [feed] = useQuery(db, FeedTraceSink.query);
  const messages = useQuery(db, feed ? Query.type(Trace.Message).from(feed) : Query.select(Filter.nothing()));
  const invocationSpans = useMemo(() => buildInvocationSpans(messages), [messages]);

  const scopedInvocationSpans = useMemo(() => {
    if (functionsForScript) {
      return invocationSpans.filter((span) => (span.key ? functionsForScript.has(span.key) : false));
    } else if (target && Obj.instanceOf(Operation.PersistentOperation, target)) {
      return invocationSpans.filter((span) => span.key === target.key);
    }
    return invocationSpans;
  }, [functionsForScript, target, invocationSpans]);

  // If there are any pending spans, refresh durations every second.
  const [_, update] = useState({});
  useEffect(() => {
    if (scopedInvocationSpans.some((span) => span.outcome === undefined)) {
      const interval = setInterval(() => update({}), 1_000);
      return () => clearInterval(interval);
    }
  }, [scopedInvocationSpans]);

  return scopedInvocationSpans;
};

/**
 * Loads all `Trace.Message`s for a single invocation (process id) from the trace feed.
 */
export const useInvocationMessages = ({ db, pid }: { db?: Database.Database; pid?: string }) => {
  const [feed] = useQuery(db, FeedTraceSink.query);
  const allMessages = useQuery(db, feed ? Query.type(Trace.Message).from(feed) : Query.select(Filter.nothing()));
  return useMemo(() => (pid ? allMessages.filter((m) => m.meta.pid === pid) : []), [allMessages, pid]);
};
