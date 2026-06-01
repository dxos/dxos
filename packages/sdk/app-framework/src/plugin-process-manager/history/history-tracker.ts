//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import { OperationInvoker } from '@dxos/operation';

import { EmptyHistoryError } from './errors';
import type { HistoryEntry } from './types';

const HISTORY_LIMIT = 100;

//
// Public Interface
//

/**
 * HistoryTracker interface - tracks operation history and provides undo.
 */
export interface HistoryTracker {
  undo: () => Effect.Effect<void, Error>;
  undoPromise: () => Promise<{ error?: Error }>;
  canUndo: () => boolean;
}

//
// Factory
//

/**
 * Creates a HistoryTracker that subscribes to invocation events and provides undo.
 *
 * Undoability is resolved by the invoker's injected undo resolver and stamped onto the success event
 * (see {@link OperationInvoker.UndoInfo}); the tracker consumes it directly. The undo toast is rendered
 * separately by the deck notification tracker subscribing to the same stream.
 */
export const make = (invoker: OperationInvoker.OperationInvokerInternal): HistoryTracker => {
  const history: HistoryEntry[] = [];

  // Subscribe to invocation stream (success-only; undoability is stamped by the invoker's resolver).
  const handleInvocation = (event: OperationInvoker.InvocationEvent) => {
    const undo = event.undo;
    if (!undo) {
      // Operation is not undoable.
      return;
    }

    const entry: HistoryEntry = {
      operation: event.operation,
      input: event.input,
      output: event.output,
      inverse: undo.inverse,
      inverseInput: undo.inverseInput,
      timestamp: event.timestamp,
    };

    history.push(entry);
    log('history entry added', { key: event.operation.meta.key, historyLength: history.length });

    // Trim history if it exceeds limit.
    if (history.length > HISTORY_LIMIT) {
      history.splice(0, history.length - HISTORY_LIMIT);
    }
  };

  // Fork a fiber to consume the invocation stream.
  Effect.runFork(
    Stream.fromPubSub(invoker.invocations).pipe(
      Stream.runForEach((event) => Effect.sync(() => handleInvocation(event))),
    ),
  );

  const undo = (): Effect.Effect<void, Error> => {
    return Effect.gen(function* () {
      const entry = history.pop();
      if (!entry) {
        return yield* Effect.fail(new EmptyHistoryError());
      }

      log('undoing operation', { key: entry.operation.meta.key, inverseKey: entry.inverse.meta.key });

      // Use _invokeCore to skip event emission (avoid undo-of-undo loops).
      yield* invoker._invokeCore(entry.inverse, entry.inverseInput);

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

  const canUndo = (): boolean => {
    return history.length > 0;
  };

  return {
    undo,
    undoPromise,
    canUndo,
  };
};
