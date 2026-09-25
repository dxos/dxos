//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as HashSet from 'effect/HashSet';
import * as Ref from 'effect/Ref';

import type * as Operation from '@dxos/compute/Operation';
import { log } from '@dxos/log';

/**
 * Invocation function type for scheduling operations.
 * @internal
 */
export type InvokeFn = <I, O>(
  op: Operation.Definition<I, O>,
  input: I,
  options?: Operation.InvokeOptions,
) => Effect.Effect<O, Error>;

//
// Public Interface
//

/**
 * FollowupScheduler - schedules operations to run as tracked background tasks.
 * Followups are not cancelled when the parent operation completes.
 * @internal
 */
export interface FollowupScheduler {
  /**
   * Schedule an operation to run as a followup.
   * The followup is tracked and won't be cancelled when the parent completes.
   */
  schedule: <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I
      ? [input?: I, options?: Operation.InvokeOptions]
      : [input: I, options?: Operation.InvokeOptions]
  ) => Effect.Effect<void>;

  /**
   * Schedule an arbitrary effect as a followup.
   * The effect is tracked and won't be cancelled when the parent completes.
   */
  scheduleEffect: <A, E>(effect: Effect.Effect<A, E, never>) => Effect.Effect<void>;

  /**
   * Number of pending followup fibers.
   */
  readonly pending: Effect.Effect<number>;

  /**
   * Wait for all pending followups to complete.
   */
  readonly awaitAll: Effect.Effect<void>;
}

//
// Internal State
//

type FollowupState = {
  fibers: HashSet.HashSet<Fiber.Fiber<unknown, unknown>>;
};

//
// Internal Implementation
//

class FollowupSchedulerImpl implements FollowupScheduler {
  private readonly _state: Ref.Ref<FollowupState>;
  private readonly _invoke: InvokeFn;

  constructor(invoke: InvokeFn) {
    this._invoke = invoke;
    // Ref.make is synchronous and safe to run with Effect.runSync.
    this._state = Effect.runSync(Ref.make<FollowupState>({ fibers: HashSet.empty() }));
  }

  private _addFiber(fiber: Fiber.Fiber<unknown, unknown>): Effect.Effect<void> {
    return Ref.update(this._state, (s) => ({ fibers: HashSet.add(s.fibers, fiber) }));
  }

  private _removeFiber(fiber: Fiber.Fiber<unknown, unknown>): Effect.Effect<void> {
    return Ref.update(this._state, (s) => ({ fibers: HashSet.remove(s.fibers, fiber) }));
  }

  // Arrow function to preserve `this` context when destructured.
  schedule = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I
      ? [input?: I, options?: Operation.InvokeOptions]
      : [input: I, options?: Operation.InvokeOptions]
  ): Effect.Effect<void> => {
    const effect = this._invoke(op, args[0] as I, args[1] as Operation.InvokeOptions | undefined).pipe(
      Effect.tap(() => Effect.sync(() => log('followup completed', { key: op.meta.key }))),
      Effect.catch((error) =>
        Effect.sync(() => {
          log.error('followup failed', { key: op.meta.key, error });
        }),
      ),
    );

    return Effect.gen({ self: this }, function* () {
      // Fork as daemon so it survives parent fiber completion.
      const fiber = yield* Effect.forkDetach(effect);
      yield* this._addFiber(fiber);

      // When the fiber completes, remove it from tracking.
      yield* Effect.forkDetach(Fiber.await(fiber).pipe(Effect.andThen(() => this._removeFiber(fiber))));
    });
  };

  // Arrow function to preserve `this` context when destructured.
  scheduleEffect = <A, E>(effect: Effect.Effect<A, E, never>): Effect.Effect<void> => {
    const wrappedEffect = effect.pipe(
      Effect.tap(() => Effect.sync(() => log('followup effect completed'))),
      Effect.catch((error) =>
        Effect.sync(() => {
          log.error('followup effect failed', { error });
        }),
      ),
    );

    return Effect.gen({ self: this }, function* () {
      // Fork as daemon so it survives parent fiber completion.
      const fiber = yield* Effect.forkDetach(wrappedEffect);
      yield* this._addFiber(fiber);

      // When the fiber completes, remove it from tracking.
      yield* Effect.forkDetach(Fiber.await(fiber).pipe(Effect.andThen(() => this._removeFiber(fiber))));
    });
  };

  get pending(): Effect.Effect<number> {
    return Ref.get(this._state).pipe(Effect.map((s) => HashSet.size(s.fibers)));
  }

  get awaitAll(): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      // Untracks each fiber here rather than leaving it to the observer fork, so `pending` is
      // settled the moment this returns; the observer's own removal is idempotent. Loops because a
      // followup may schedule further followups while this is awaiting.
      while (true) {
        const { fibers } = yield* Ref.get(this._state);
        if (HashSet.size(fibers) === 0) {
          return;
        }
        yield* Effect.forEach(fibers, (fiber) => Fiber.await(fiber).pipe(Effect.andThen(this._removeFiber(fiber))), {
          concurrency: 'unbounded',
          discard: true,
        });
      }
    });
  }
}

//
// Factory
//

/**
 * Creates a FollowupScheduler that tracks and executes followup operations.
 * @internal
 *
 * @param invoke - Function to invoke operations (typically from OperationInvoker).
 */
export const make = (invoke: InvokeFn): FollowupScheduler => new FollowupSchedulerImpl(invoke);
