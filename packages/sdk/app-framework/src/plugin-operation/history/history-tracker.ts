//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { runAndForwardErrors } from '@dxos/effect';
import { Trace } from '@dxos/functions';
import { log } from '@dxos/log';
import { type Operation } from '@dxos/operation';

import { type Label } from '../../common';
import { EmptyHistoryError } from './errors';
import type { HistoryEntry } from './types';
import { resolveMessage } from './undo-mapping';
import type { UndoRegistry } from './undo-registry';

const HISTORY_LIMIT = 100;

/**
 * Bound on in-flight {@link Pending} records, keyed by `${pid}:${operationKey}`.
 * Entries are normally removed on `Trace.OperationEnd`, but we cap the map to
 * avoid unbounded memory retention when the terminal event is never observed
 * (trace transport loss, aborted process, etc.).
 */
const PENDING_LIMIT = 1000;

//
// Public Interface
//

/**
 * HistoryTracker interface - tracks operation history and provides undo.
 *
 * The tracker consumes {@link Trace.Message}s through {@link traceSink} — the
 * host wires it up as a {@link Trace.TraceSink} contributor so every
 * operation invocation flowing through the process-manager runtime is
 * observed. Ephemeral `operation.input` / `operation.output` events carry
 * the raw payloads and the persisted `operation.end` marks completion.
 */
export interface HistoryTracker {
  readonly undo: () => Effect.Effect<void, Error>;
  readonly undoPromise: () => Promise<{ error?: Error }>;
  readonly canUndo: () => boolean;
  /**
   * Sink that should receive every trace message produced by operation
   * invocations. The host typically contributes this as a
   * {@link Trace.TraceSink} (see `history/capability.ts`).
   */
  readonly traceSink: Trace.Sink;
}

/**
 * Ways of invoking an operation known by the tracker.
 *
 * - `invokeInverse` runs the inverse operation during `undo()`.
 * - `invokeShowUndo` fires the `UndoOperation.ShowUndo` notification. A
 *   separate hook so the implementation can route it through whatever
 *   surface the host wants (toast, log, etc.).
 */
export interface HistoryTrackerInvoker {
  readonly invokeInverse: (inverse: Operation.Definition<any, any>, inverseInput: any) => Effect.Effect<unknown, Error>;
  readonly invokeShowUndo: (message: Label | undefined) => void;
}

export interface HistoryTrackerOptions {
  readonly invoker: HistoryTrackerInvoker;
  readonly undoRegistry: UndoRegistry;
}

//
// Factory
//

/**
 * Create a {@link HistoryTracker} that observes operation traces and records
 * undoable invocations. The tracker is completely decoupled from any
 * particular operation invoker: the host plumbs in a
 * {@link HistoryTrackerInvoker} for executing the inverse operation and
 * forwarding show-undo notifications, and wires `tracker.traceSink` into the
 * runtime's trace fan-out.
 */
export const make = (opts: HistoryTrackerOptions): HistoryTracker => {
  const { invoker, undoRegistry } = opts;

  const history: HistoryEntry[] = [];
  // In-flight invocations keyed by `${pid}:${operationKey}` so that concurrent
  // operations within the same process don't collide on a shared Pending record.
  type Pending = {
    readonly pid: string;
    readonly key: string;
    input?: unknown;
    inputSeen: boolean;
    output?: unknown;
    outputSeen: boolean;
  };
  const pendingByPidAndKey = new Map<string, Pending>();

  const pendingKey = (pid: string, key: string): string => `${pid}:${key}`;

  const getOrCreatePending = (pid: string, key: string): Pending => {
    const mapKey = pendingKey(pid, key);
    let pending = pendingByPidAndKey.get(mapKey);
    if (!pending) {
      // Drop oldest entries when we exceed the cap. `Map` iterates in
      // insertion order, so the first key is the oldest — good enough to
      // prevent unbounded growth when `Trace.OperationEnd` events are lost.
      while (pendingByPidAndKey.size >= PENDING_LIMIT) {
        const oldest = pendingByPidAndKey.keys().next().value;
        if (oldest === undefined) {
          break;
        }
        pendingByPidAndKey.delete(oldest);
      }
      pending = { pid, key, inputSeen: false, outputSeen: false };
      pendingByPidAndKey.set(mapKey, pending);
    }
    return pending;
  };

  const recordHistoryEntry = (pending: Pending): void => {
    const mapping = undoRegistry.lookupByKey(pending.key);
    if (!mapping) {
      return;
    }
    if (!pending.inputSeen || !pending.outputSeen) {
      // Operation completed without the ephemeral input/output events we
      // need. Can't build an undo entry without them.
      log('operation missing ephemeral input/output events; skipping undo tracking', { key: pending.key });
      return;
    }

    const inverseInput = mapping.deriveContext(pending.input, pending.output);
    if (inverseInput === undefined) {
      log('operation not undoable (deriveContext returned undefined)', { key: pending.key });
      return;
    }

    const entry: HistoryEntry = {
      // Lookup by key only — we never reify the original operation
      // definition in this code path. The inverse is what we invoke on undo.
      operation: { meta: { key: pending.key } } as Operation.Definition<any, any>,
      input: pending.input,
      output: pending.output,
      inverse: mapping.inverse,
      inverseInput,
      timestamp: Date.now(),
    };

    history.push(entry);
    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }

    const resolvedMessage =
      mapping.message !== undefined ? resolveMessage(mapping.message, pending.input, pending.output) : undefined;
    invoker.invokeShowUndo(resolvedMessage);
  };

  const handleMessage = (message: Trace.Message): void => {
    const pid = message.meta.pid;
    if (!pid) {
      return;
    }
    for (const event of message.events) {
      if (Trace.isOfType(Trace.OperationInput, event)) {
        const pending = getOrCreatePending(pid, event.data.key);
        pending.input = event.data.input;
        pending.inputSeen = true;
      } else if (Trace.isOfType(Trace.OperationOutput, event)) {
        const pending = getOrCreatePending(pid, event.data.key);
        pending.output = event.data.output;
        pending.outputSeen = true;
      } else if (Trace.isOfType(Trace.OperationEnd, event)) {
        const mapKey = pendingKey(pid, event.data.key);
        const pending = pendingByPidAndKey.get(mapKey);
        pendingByPidAndKey.delete(mapKey);
        if (pending && event.data.outcome === 'success') {
          recordHistoryEntry(pending);
        }
      }
    }
  };

  const traceSink: Trace.Sink = {
    write: (message) => {
      try {
        handleMessage(message);
      } catch (err) {
        log.warn('[history] error handling trace message', { err });
      }
    },
  };

  const undo = (): Effect.Effect<void, Error> => {
    return Effect.gen(function* () {
      const entry = history.pop();
      if (!entry) {
        return yield* Effect.fail(new EmptyHistoryError());
      }

      log('undoing operation', { key: entry.operation.meta.key, inverseKey: entry.inverse.meta.key });
      yield* invoker.invokeInverse(entry.inverse, entry.inverseInput);
      log('undo completed', { key: entry.operation.meta.key });
    });
  };

  const undoPromise = async (): Promise<{ error?: Error }> => {
    return runAndForwardErrors(undo())
      .then(() => ({}))
      .catch((error) => {
        log.catch(error);
        return { error };
      });
  };

  const canUndo = (): boolean => history.length > 0;

  return {
    undo,
    undoPromise,
    canUndo,
    traceSink,
  };
};
