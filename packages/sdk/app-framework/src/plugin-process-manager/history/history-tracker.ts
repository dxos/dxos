//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as PubSub from 'effect/PubSub';
import * as Semaphore from 'effect/Semaphore';
import * as Stream from 'effect/Stream';

import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import { OperationInvoker } from '@dxos/operation';

import { type Label } from '../../common/translations.ts';
import { EmptyFutureError, EmptyHistoryError } from './errors.ts';
import type { HistoryEntry, HistoryStep } from './types.ts';
import { resolveMessage } from './undo-mapping.ts';
import type { UndoMappingResult, UndoRegistry } from './undo-registry.ts';

const DEFAULT_HISTORY_LIMIT = 100;
const DEFAULT_MERGE_WINDOW = 500;

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
  /** Scope of the recorded entry, if any. */
  scope?: string;
  /** False when the mapping asked for no undo toast. */
  toast?: boolean;
};

/**
 * What an undo or redo acted on; returned by `undo`/`redo` and carried by {@link HistoryEvent}.
 */
export type HistoryResult = {
  scope?: string;
  /** Caller-supplied context recorded with the entry (e.g. view path and selection). */
  context?: unknown;
  message?: Label;
};

/**
 * Emitted around each undo and redo so the UI can restore where the change happened:
 * `before` fires ahead of the first invocation, `after` once every invocation has succeeded.
 */
export type HistoryEvent = HistoryResult & {
  type: 'undo' | 'redo';
  phase: 'before' | 'after';
};

/**
 * Options for {@link HistoryTracker.transaction}.
 */
export type TransactionOptions = {
  /** Scope of the entry; defaults to the scope shared by every grouped invocation, if they share one. */
  scope?: string;
  /** Opaque context returned on undo and redo; defaults to the first grouped invocation's context. */
  context?: unknown;
};

/**
 * Options for {@link make}.
 */
export type HistoryTrackerOptions = {
  /** Maximum number of entries kept on each of the undo and redo stacks. */
  limit?: number;
  /** Milliseconds within which consecutive entries with equal scope and merge key fold together. */
  mergeWindow?: number;
};

/**
 * HistoryTracker interface - tracks operation history and provides undo and redo.
 * Every method taking an optional `scope` acts on the latest entry in that scope, or on the latest
 * entry across the whole app when the scope is omitted.
 */
export interface HistoryTracker {
  undo: (scope?: string) => Effect.Effect<HistoryResult, Error>;
  undoPromise: (scope?: string) => Promise<{ result?: HistoryResult; error?: Error }>;
  canUndo: (scope?: string) => boolean;
  redo: (scope?: string) => Effect.Effect<HistoryResult, Error>;
  redoPromise: (scope?: string) => Promise<{ result?: HistoryResult; error?: Error }>;
  canRedo: (scope?: string) => boolean;
  /**
   * Runs the effect and records every undoable invocation it makes as one entry labelled `label`.
   * Nested transactions join the outermost one.
   */
  transaction: <A, E, R>(
    label: Label,
    effect: Effect.Effect<A, E, R>,
    options?: TransactionOptions,
  ) => Effect.Effect<A, E, R>;
  /** Stream of undoable actions, published as they are recorded. */
  undoable: PubSub.PubSub<UndoableEvent>;
  /** Stream of undo and redo applications. */
  applied: PubSub.PubSub<HistoryEvent>;
}

//
// Internal
//

/** Marks fibers already inside a transaction so nested calls join the outer one instead of deadlocking. */
const InTransaction = Context.Reference<boolean>('org.dxos.app-framework.HistoryTracker.InTransaction', {
  defaultValue: () => false,
});

type RecordedStep = {
  step: HistoryStep;
  mapping: UndoMappingResult;
};

const findLastIndex = (entries: HistoryEntry[], scope: string | undefined): number =>
  scope === undefined ? entries.length - 1 : entries.findLastIndex((entry) => entry.scope === scope);

const trim = (entries: HistoryEntry[], limit: number) => {
  if (entries.length > limit) {
    entries.splice(0, entries.length - limit);
  }
};

const toResult = (entry: HistoryEntry): HistoryResult => ({
  scope: entry.scope,
  context: entry.context,
  message: entry.message,
});

//
// Factory
//

/**
 * Creates a HistoryTracker that subscribes to (successful) invocation events, derives undoability from
 * the undo registry, maintains the undo and redo stacks, and publishes an {@link UndoableEvent} for each
 * undoable action so the UI can offer an undo affordance. The invoker itself is undo-agnostic.
 */
export const make = (
  invoker: OperationInvoker.OperationInvokerInternal,
  undoRegistry: UndoRegistry,
  { limit = DEFAULT_HISTORY_LIMIT, mergeWindow = DEFAULT_MERGE_WINDOW }: HistoryTrackerOptions = {},
): HistoryTracker => {
  const past: HistoryEntry[] = [];
  const future: HistoryEntry[] = [];
  const undoable = Effect.runSync(PubSub.unbounded<UndoableEvent>());
  const applied = Effect.runSync(PubSub.unbounded<HistoryEvent>());

  const emit = (type: HistoryEvent['type'], phase: HistoryEvent['phase'], result: HistoryResult) =>
    PubSub.publish(applied, { type, phase, ...result });

  // Latest entry per scope that a new invocation may fold into; cleared by undo/redo so a merge never
  // reaches past an entry the user has already stepped over.
  const mergeCandidates = new Map<string | undefined, HistoryEntry>();

  // Transactions are serialized because their invocations are attributed by time window, not by fiber.
  const transactionLock = Semaphore.makeUnsafe(1);
  let transactionOpen = false;
  // Events the consumer saw while a transaction was open; resolved when it closes.
  let buffered: OperationInvoker.InvocationEvent[] = [];
  // Events grouped into a transaction, which the consumer must not record again.
  const claimed = new WeakSet<OperationInvoker.InvocationEvent>();

  const toStep = (event: OperationInvoker.InvocationEvent): RecordedStep | undefined => {
    const mapping = undoRegistry.lookup(event.operation);
    if (!mapping) {
      return undefined;
    }

    const inverseInput = mapping.deriveContext(event.input, event.output);
    if (inverseInput === undefined) {
      return undefined;
    }

    return {
      step: {
        operation: event.operation,
        input: event.input,
        output: event.output,
        inverse: mapping.inverse,
        inverseInput,
      },
      mapping,
    };
  };

  const pushEntry = (entry: HistoryEntry) => {
    past.push(entry);
    trim(past, limit);
    future.length = 0;
    // A newer entry touching a scope must block merges into older entries of that scope, even when it is
    // stored under another scope (an explicit transaction scope, or none for a mixed-scope transaction).
    for (const step of entry.steps) {
      mergeCandidates.delete(undoRegistry.lookup(step.operation)?.scope?.(step.input, step.output));
    }
    mergeCandidates.set(entry.scope, entry);
    log('history entry added', { scope: entry.scope, steps: entry.steps.length, historyLength: past.length });
  };

  // Record an invocation; returns the undoable event to publish, or undefined if not undoable or merged.
  const recordInvocation = (event: OperationInvoker.InvocationEvent): UndoableEvent | undefined => {
    const recorded = toStep(event);
    if (!recorded) {
      return undefined;
    }

    const { step, mapping } = recorded;
    const scope = mapping.scope?.(event.input, event.output);
    const mergeKey = mapping.mergeKey?.(event.input, event.output);

    const candidate = mergeCandidates.get(scope);
    if (
      mergeKey !== undefined &&
      candidate !== undefined &&
      candidate.mergeKey === mergeKey &&
      candidate.steps.length === 1 &&
      candidate.steps[0].operation.meta.key === event.operation.meta.key &&
      event.timestamp - candidate.updated <= mergeWindow
    ) {
      const [earlier] = candidate.steps;
      const merged = mapping.merge?.(
        { input: earlier.input, output: earlier.output },
        { input: event.input, output: event.output },
      );
      // A folded forward derives its own inverse; otherwise keep the earliest inverse so one undo returns to before
      // the first edit, and take the latest forward for redo.
      const inverseInput = merged && mapping.deriveContext(merged.input, merged.output);
      candidate.steps[0] =
        merged && inverseInput !== undefined
          ? { ...earlier, input: merged.input, output: merged.output, inverseInput }
          : { ...earlier, input: event.input, output: event.output };
      candidate.updated = event.timestamp;
      future.length = 0;
      log('history entry merged', { key: event.operation.meta.key, mergeKey });
      return undefined;
    }

    const message = resolveMessage(mapping.message, event.input, event.output);
    pushEntry({
      steps: [step],
      scope,
      mergeKey,
      context: mapping.context?.(event.input, event.output),
      message,
      timestamp: event.timestamp,
      updated: event.timestamp,
    });

    return { message, scope, ...(mapping.toast === false ? { toast: false } : {}) };
  };

  const handleEvent = (event: OperationInvoker.InvocationEvent): UndoableEvent | undefined => {
    if (claimed.has(event)) {
      return undefined;
    }
    if (transactionOpen) {
      buffered.push(event);
      return undefined;
    }
    return recordInvocation(event);
  };

  // Closes the open transaction synchronously so the consumer fiber cannot interleave between claiming and flushing.
  const closeTransaction = (
    events: readonly OperationInvoker.InvocationEvent[],
    label: Label,
    options: TransactionOptions,
  ): UndoableEvent[] => {
    transactionOpen = false;
    events.forEach((event) => claimed.add(event));

    // Events published before the transaction opened were buffered but belong to no transaction.
    const results: UndoableEvent[] = [];
    const pending = buffered;
    buffered = [];
    for (const event of pending) {
      const result = handleEvent(event);
      if (result) {
        results.push(result);
      }
    }

    const recorded = events.map(toStep).filter((step): step is RecordedStep => step !== undefined);
    if (recorded.length === 0) {
      return results;
    }

    const scopes = new Set(recorded.map(({ step, mapping }) => mapping.scope?.(step.input, step.output)));
    const [first] = recorded;
    const scope = options.scope ?? (scopes.size === 1 ? [...scopes][0] : undefined);
    const timestamp = events[0]?.timestamp ?? Date.now();
    pushEntry({
      steps: recorded.map(({ step }) => step),
      scope,
      context: options.context ?? first.mapping.context?.(first.step.input, first.step.output),
      message: label,
      timestamp,
      updated: timestamp,
    });
    results.push({ message: label, scope });
    return results;
  };

  // Fork a fiber to consume the invocation stream.
  Effect.runFork(
    Stream.fromPubSub(invoker.invocations).pipe(
      Stream.runForEach((event) =>
        Effect.gen(function* () {
          const undoableEvent = handleEvent(event);
          if (undoableEvent) {
            yield* PubSub.publish(undoable, undoableEvent);
          }
        }),
      ),
    ),
  );

  const transaction = <A, E, R>(
    label: Label,
    effect: Effect.Effect<A, E, R>,
    options: TransactionOptions = {},
  ): Effect.Effect<A, E, R> =>
    Effect.gen(function* () {
      if (yield* InTransaction) {
        return yield* effect;
      }

      return yield* Effect.scoped(
        Effect.gen(function* () {
          // Opened before subscribing so an event the consumer sees in between is buffered, not recorded twice.
          transactionOpen = true;
          const subscription = yield* PubSub.subscribe(invoker.invocations);
          return yield* effect.pipe(
            Effect.provideService(InTransaction, true),
            // Partial work is recorded on failure too, since its invocations already changed state.
            Effect.onExit(() =>
              Effect.gen(function* () {
                const count = yield* PubSub.remaining(subscription);
                const events = count > 0 ? yield* PubSub.takeUpTo(subscription, count) : [];
                for (const event of closeTransaction(events, label, options)) {
                  yield* PubSub.publish(undoable, event);
                }
              }),
            ),
          );
        }),
      ).pipe(Semaphore.withPermit(transactionLock));
    });

  const undo = (scope?: string): Effect.Effect<HistoryResult, Error> =>
    Effect.gen(function* () {
      const index = findLastIndex(past, scope);
      if (index < 0) {
        return yield* Effect.fail(new EmptyHistoryError());
      }

      const [entry] = past.splice(index, 1);
      mergeCandidates.clear();
      const result = toResult(entry);
      log('undoing entry', { scope: entry.scope, steps: entry.steps.length });

      yield* emit('undo', 'before', result);
      // Index of the first step whose inverse has run; steps run backwards from the end.
      let undone = entry.steps.length;
      yield* Effect.gen(function* () {
        while (undone > 0) {
          const step = entry.steps[undone - 1];
          // Use _invokeCore to skip event emission (avoid undo-of-undo loops).
          yield* invoker._invokeCore(step.inverse, step.inverseInput);
          undone--;
        }
      }).pipe(
        Effect.ensuring(
          Effect.sync(() => {
            // On failure the undone tail stays redoable and the steps before the failing one stay undoable;
            // the failing step is dropped so a permanently failing inverse cannot block undo.
            const failed = undone > 0 ? 1 : 0;
            const remaining = entry.steps.slice(0, undone - failed);
            if (remaining.length > 0) {
              past.splice(index, 0, { ...entry, steps: remaining });
            }
            const reverted = entry.steps.slice(undone);
            if (reverted.length > 0) {
              future.push({ ...entry, steps: reverted });
              trim(future, limit);
            }
          }),
        ),
      );

      yield* emit('undo', 'after', result);
      return result;
    });

  const redo = (scope?: string): Effect.Effect<HistoryResult, Error> =>
    Effect.gen(function* () {
      const index = findLastIndex(future, scope);
      if (index < 0) {
        return yield* Effect.fail(new EmptyFutureError());
      }

      const [entry] = future.splice(index, 1);
      mergeCandidates.clear();
      const result = toResult(entry);
      log('redoing entry', { scope: entry.scope, steps: entry.steps.length });

      yield* emit('redo', 'before', result);
      const steps: HistoryStep[] = [];
      yield* Effect.gen(function* () {
        for (const step of entry.steps) {
          // Use _invokeCore so the redo is not recorded as a new entry (which would clear the redo stack).
          const output = yield* invoker._invokeCore(step.operation, step.input);
          // The forward may produce new identities (e.g. a re-created object), so the inverse is derived afresh.
          const mapping = undoRegistry.lookup(step.operation);
          const inverseInput = mapping?.deriveContext(step.input, output);
          if (mapping && inverseInput !== undefined) {
            steps.push({ ...step, output, inverse: mapping.inverse, inverseInput });
          }
        }
      }).pipe(
        // Forwards that ran before a failure already changed state, so they stay undoable.
        Effect.ensuring(
          Effect.sync(() => {
            if (steps.length > 0) {
              past.push({ ...entry, steps });
              trim(past, limit);
            }
          }),
        ),
      );

      yield* emit('redo', 'after', result);
      return result;
    });

  const toPromise = async (effect: Effect.Effect<HistoryResult, Error>) =>
    EffectEx.runAndForwardErrors(effect)
      .then((result): { result?: HistoryResult; error?: Error } => ({ result }))
      .catch((error) => {
        log.catch(error);
        return { error };
      });

  return {
    undo,
    undoPromise: (scope) => toPromise(undo(scope)),
    canUndo: (scope) => findLastIndex(past, scope) >= 0,
    redo,
    redoPromise: (scope) => toPromise(redo(scope)),
    canRedo: (scope) => findLastIndex(future, scope) >= 0,
    transaction,
    undoable,
    applied,
  };
};

export { EmptyFutureError, EmptyHistoryError } from './errors.ts';
export type { HistoryEntry, HistoryStep } from './types.ts';
