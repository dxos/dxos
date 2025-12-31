//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';

import { type OperationInvoker } from '../invoker';

import { EmptyHistoryError } from './errors';
import type { HistoryEntry } from './types';
import type { UndoRegistry } from './undo-registry';

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
 */
export const make = (invoker: OperationInvoker.OperationInvoker, undoRegistry: UndoRegistry): HistoryTracker => {
  const history: HistoryEntry[] = [];

  // Subscribe to invocation stream.
  const handleInvocation = (event: OperationInvoker.InvocationEvent) => {
    const mapping = undoRegistry.lookup(event.operation);
    if (!mapping) {
      // Operation is not undoable, skip.
      return;
    }

    const inverseInput = mapping.deriveContext(event.input, event.output);
    const entry: HistoryEntry = {
      operation: event.operation,
      input: event.input,
      output: event.output,
      inverse: mapping.inverse,
      inverseInput,
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
