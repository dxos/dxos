//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';
import * as Stream from 'effect/Stream';

import { EffectEx } from '@dxos/effect';
import { log } from '@dxos/log';
import { OperationInvoker } from '@dxos/operation';

import { type Label } from '../../common';
import { EmptyHistoryError } from './errors';
import type { HistoryEntry } from './types';
import { resolveMessage } from './undo-mapping';
import type { UndoRegistry } from './undo-registry';

const HISTORY_LIMIT = 100;

//
// Public Interface
//

/**
 * Emitted when a new undoable action is recorded; consumed by the UI to surface an undo affordance
 * (e.g. the deck notification tracker's undo toast).
 */
export type UndoableEvent = {
  /** Message describing the undoable action. */
  message?: Label;
};

/**
 * HistoryTracker interface - tracks operation history and provides undo.
 */
export interface HistoryTracker {
  undo: () => Effect.Effect<void, Error>;
  undoPromise: () => Promise<{ error?: Error }>;
  canUndo: () => boolean;
  /** Stream of undoable actions, published as they are recorded. */
  undoable: PubSub.PubSub<UndoableEvent>;
}

//
// Factory
//

/**
 * Creates a HistoryTracker that subscribes to (successful) invocation events, derives undoability from
 * the undo registry, maintains the undo stack, and publishes an {@link UndoableEvent} for each undoable
 * action so the UI can offer an undo affordance. The invoker itself is undo-agnostic.
 */
export const make = (
  invoker: OperationInvoker.OperationInvokerInternal,
  undoRegistry: UndoRegistry,
): HistoryTracker => {
  const history: HistoryEntry[] = [];
  const undoable = Effect.runSync(PubSub.unbounded<UndoableEvent>());

  // Record an invocation; returns the undoable event to publish, or undefined if not undoable.
  const recordInvocation = (event: OperationInvoker.InvocationEvent): UndoableEvent | undefined => {
    const mapping = undoRegistry.lookup(event.operation);
    if (!mapping) {
      // Operation is not undoable.
      return undefined;
    }

    const inverseInput = mapping.deriveContext(event.input, event.output);
    if (inverseInput === undefined) {
      // Operation is conditionally not undoable (deriveContext returned undefined).
      return undefined;
    }

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

    return { message: resolveMessage(mapping.message, event.input, event.output) };
  };

  // Fork a fiber to consume the invocation stream.
  Effect.runFork(
    Stream.fromPubSub(invoker.invocations).pipe(
      Stream.runForEach((event) =>
        Effect.gen(function* () {
          const undoableEvent = recordInvocation(event);
          if (undoableEvent) {
            yield* PubSub.publish(undoable, undoableEvent);
          }
        }),
      ),
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
    return EffectEx.runAndForwardErrors(undo())
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
    undoable,
  };
};
