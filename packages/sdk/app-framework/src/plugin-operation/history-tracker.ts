//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';

import * as Common from '../common';
import { Capability, type PluginContext } from '../core';

import { EmptyHistoryError } from './errors';
import type {
  HistoryEntry,
  HistoryTrackerInterface,
  InvocationEvent,
  OperationInvokerInterface,
  UndoRegistryInterface,
} from './types';

const HISTORY_LIMIT = 100;

/**
 * Creates a HistoryTracker that subscribes to invocation events and provides undo.
 */
export const createHistoryTracker = (
  invoker: OperationInvokerInterface,
  undoRegistry: UndoRegistryInterface,
): HistoryTrackerInterface => {
  const history: HistoryEntry[] = [];

  // Subscribe to invocation events.
  const handleInvocation = (event: InvocationEvent) => {
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

  // Subscribe to invoker events.
  invoker.subscribe(handleInvocation);

  const undo = (): Effect.Effect<void, Error> => {
    return Effect.gen(function* () {
      const entry = history.pop();
      if (!entry) {
        return yield* Effect.fail(new EmptyHistoryError());
      }

      log('undoing operation', { key: entry.operation.meta.key, inverseKey: entry.inverse.meta.key });

      // Use invokeInternal to skip stream emission (avoid undo-of-undo loops).
      yield* invoker.invokeInternal(entry.inverse, entry.inverseInput);

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

export default Capability.makeModule((context: PluginContext) =>
  Effect.gen(function* () {
    const invoker = context.getCapability(Common.Capability.OperationInvoker);
    const undoRegistry = context.getCapability(Common.Capability.UndoRegistry);

    const tracker = createHistoryTracker(invoker, undoRegistry);

    return Effect.succeed(Capability.contributes(Common.Capability.HistoryTracker, tracker));
  }).pipe(Effect.flatten),
);

