//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as HashSet from 'effect/HashSet';
import * as Ref from 'effect/Ref';

import { log } from '@dxos/log';
import type { OperationDefinition } from '@dxos/operation';

/**
 * Invocation function type for scheduling operations.
 */
export type InvokeFn = <I, O>(op: OperationDefinition<I, O>, input: I) => Effect.Effect<O, Error>;

//
// Public Interface
//

/**
 * FollowupScheduler - schedules operations to run as tracked background tasks.
 * Followups are not cancelled when the parent operation completes.
 */
export interface FollowupScheduler {
  /**
   * Schedule an operation to run as a followup.
   * The followup is tracked and won't be cancelled when the parent completes.
   */
  schedule: <I, O>(op: OperationDefinition<I, O>, input: I) => Effect.Effect<void>;

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
  fibers: HashSet.HashSet<Fiber.RuntimeFiber<unknown, unknown>>;
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

  private _addFiber(fiber: Fiber.RuntimeFiber<unknown, unknown>): Effect.Effect<void> {
    return Ref.update(this._state, (s) => ({ fibers: HashSet.add(s.fibers, fiber) }));
  }

  private _removeFiber(fiber: Fiber.RuntimeFiber<unknown, unknown>): Effect.Effect<void> {
    return Ref.update(this._state, (s) => ({ fibers: HashSet.remove(s.fibers, fiber) }));
  }

  // Arrow function to preserve `this` context when destructured.
  schedule = <I, O>(op: OperationDefinition<I, O>, input: I): Effect.Effect<void> => {
    const effect = this._invoke(op, input).pipe(
      Effect.tap(() => Effect.sync(() => log('followup completed', { key: op.meta.key }))),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          log.error('followup failed', { key: op.meta.key, error });
        }),
      ),
    );

    return Effect.gen(this, function* () {
      // Fork as daemon so it survives parent fiber completion.
      const fiber = yield* Effect.forkDaemon(effect);
      yield* this._addFiber(fiber);

      // When the fiber completes, remove it from tracking.
      yield* Effect.forkDaemon(Fiber.await(fiber).pipe(Effect.andThen(() => this._removeFiber(fiber))));
    });
  };

  // Arrow function to preserve `this` context when destructured.
  scheduleEffect = <A, E>(effect: Effect.Effect<A, E, never>): Effect.Effect<void> => {
    const wrappedEffect = effect.pipe(
      Effect.tap(() => Effect.sync(() => log('followup effect completed'))),
      Effect.catchAll((error) =>
        Effect.sync(() => {
          log.error('followup effect failed', { error });
        }),
      ),
    );

    return Effect.gen(this, function* () {
      // Fork as daemon so it survives parent fiber completion.
      const fiber = yield* Effect.forkDaemon(wrappedEffect);
      yield* this._addFiber(fiber);

      // When the fiber completes, remove it from tracking.
      yield* Effect.forkDaemon(Fiber.await(fiber).pipe(Effect.andThen(() => this._removeFiber(fiber))));
    });
  };

  get pending(): Effect.Effect<number> {
    return Ref.get(this._state).pipe(Effect.map((s) => HashSet.size(s.fibers)));
  }

  get awaitAll(): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const { fibers } = yield* Ref.get(this._state);
      yield* Effect.forEach(fibers, (fiber) => Fiber.await(fiber), { concurrency: 'unbounded' });
    });
  }
}

//
// Factory
//

/**
 * Creates a FollowupScheduler that tracks and executes followup operations.
 *
 * @param invoke - Function to invoke operations (typically from OperationInvoker).
 *
 * @example
 * ```ts
 * const scheduler = FollowupScheduler.make(invoker._invokeCore);
 * yield* scheduler.schedule(ObservabilityOperation.SendEvent, { name: 'test' });
 * ```
 */
export const make = (invoke: InvokeFn): FollowupScheduler => new FollowupSchedulerImpl(invoke);

//
// Service Tag
//

/**
 * Context tag for the FollowupScheduler service.
 * Handlers can yield this to schedule followup operations.
 *
 * @example
 * ```ts
 * const scheduler = yield* FollowupScheduler.Service;
 * yield* scheduler.schedule(MyOperation, { data: 'test' });
 * ```
 */
export class Service extends Context.Tag('@dxos/operation/FollowupScheduler')<Service, FollowupScheduler>() {}
