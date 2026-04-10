//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import type * as ManagedRuntime from 'effect/ManagedRuntime';
import * as PubSub from 'effect/PubSub';

import type { Key } from '@dxos/echo';
import { DynamicRuntime, unwrapExit } from '@dxos/effect';
import { Performance } from '@dxos/effect';
import { log } from '@dxos/log';

import { InvokerNotInitializedError, NoHandlerError } from './errors';
import * as Operation from './Operation';
import * as Scheduler from './scheduler';

// @import-as-namespace

/**
 * Invocation event emitted after each operation.
 */
export type InvocationEvent<I = any, O = any> = {
  operation: Operation.Definition<I, O>;
  input: I;
  output: O;
  timestamp: number;
};

/**
 * Resolves a spaceId to a context containing Database.Service.
 * Provided by the caller to avoid coupling to client/echo.
 */
export type DatabaseResolver = (spaceId: Key.SpaceId) => Effect.Effect<Context.Context<any>>;

//
// Public Interface
//

/**
 * OperationInvoker interface - resolves and executes operations.
 */
export interface OperationInvoker {
  invoke: <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I
      ? [input?: I, options?: Operation.InvokeOptions]
      : [input: I, options?: Operation.InvokeOptions]
  ) => Effect.Effect<O, NoHandlerError>;
  /**
   * Schedule an operation to run as a followup.
   * The followup is tracked and won't be cancelled when the parent operation completes.
   * Returns an Effect that completes immediately after scheduling.
   */
  schedule: <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I ? [input?: I] : [input: I]
  ) => Effect.Effect<void>;
  invokePromise: <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I
      ? [input?: I, options?: Operation.InvokeOptions]
      : [input: I, options?: Operation.InvokeOptions]
  ) => Promise<{ data?: O; error?: Error }>;
  /** Effect stream of invocation events. */
  invocations: PubSub.PubSub<InvocationEvent>;
  /** Number of pending followup operations. */
  pendingFollowups: Effect.Effect<number>;
  /** Wait for all pending followups to complete. */
  awaitFollowups: Effect.Effect<void>;
}

/**
 * Internal interface extending OperationInvoker with core invocation method.
 * Used by history tracker and scheduler to avoid event emission loops.
 */
export interface OperationInvokerInternal extends OperationInvoker {
  /**
   * Core invocation without event emission.
   * Used by history tracker to avoid undo-of-undo loops.
   */
  _invokeCore: <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    options?: Operation.InvokeOptions,
  ) => Effect.Effect<O, NoHandlerError>;
}

//
// Internal Implementation
//

type AnyManagedRuntime = ManagedRuntime.ManagedRuntime<any, any>;

class OperationInvokerImpl implements OperationInvokerInternal {
  private readonly _pubsub: PubSub.PubSub<InvocationEvent>;
  private readonly _getHandlers: () => Effect.Effect<Operation.WithHandler<Operation.Definition.Any>[]>;
  private readonly _followupScheduler: Scheduler.FollowupScheduler;
  private readonly _managedRuntime: AnyManagedRuntime;
  private readonly _databaseResolver?: DatabaseResolver;
  // Cache for DynamicRuntime instances keyed by service tag keys.
  private readonly _dynamicRuntimeCache = new Map<string, DynamicRuntime.DynamicRuntime<any>>();

  constructor(
    getHandlers: () => Effect.Effect<Operation.WithHandler<Operation.Definition.Any>[]>,
    followupScheduler: Scheduler.FollowupScheduler,
    managedRuntime: AnyManagedRuntime,
    databaseResolver?: DatabaseResolver,
  ) {
    this._getHandlers = getHandlers;
    this._pubsub = Effect.runSync(PubSub.unbounded<InvocationEvent>());
    this._followupScheduler = followupScheduler;
    this._managedRuntime = managedRuntime;
    this._databaseResolver = databaseResolver;
  }

  /**
   * Get or create a DynamicRuntime for the given service tags.
   * Caches instances to allow runtime caching to work across invocations.
   */
  private _getDynamicRuntime(services: readonly Context.Tag<any, any>[]): DynamicRuntime.DynamicRuntime<any> {
    const cacheKey = services
      .map((s) => s.key)
      .sort()
      .join(',');
    let dynamicRuntime = this._dynamicRuntimeCache.get(cacheKey);
    if (!dynamicRuntime) {
      dynamicRuntime = DynamicRuntime.make(this._managedRuntime!, services);
      this._dynamicRuntimeCache.set(cacheKey, dynamicRuntime);
    }
    return dynamicRuntime;
  }

  get invocations(): PubSub.PubSub<InvocationEvent> {
    return this._pubsub;
  }

  get pendingFollowups(): Effect.Effect<number> {
    return this._followupScheduler.pending;
  }

  get awaitFollowups(): Effect.Effect<void> {
    return this._followupScheduler.awaitAll;
  }

  // Arrow function to preserve `this` context when destructured.
  schedule = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I ? [input?: I] : [input: I]
  ): Effect.Effect<void> => this._followupScheduler.schedule(op, ...(args as [I]));

  // Arrow function to preserve `this` context when destructured.
  invoke = <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I
      ? [input?: I, options?: Operation.InvokeOptions]
      : [input: I, options?: Operation.InvokeOptions]
  ): Effect.Effect<O, NoHandlerError> => {
    const input = args[0] as I;
    const options = args[1] as Operation.InvokeOptions | undefined;
    return Effect.gen(this, function* () {
      const output = yield* this._invokeCore(op, input, options);

      // Publish event after successful invocation.
      yield* PubSub.publish(this._pubsub, {
        operation: op,
        input,
        output,
        timestamp: Date.now(),
      });

      return output;
    });
  };

  // Arrow function to preserve `this` context when destructured.
  invokePromise = async <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I
      ? [input?: I, options?: Operation.InvokeOptions]
      : [input: I, options?: Operation.InvokeOptions]
  ): Promise<{ data?: O; error?: Error }> => {
    const effect = this.invoke(op, ...args);
    const exit = await this._managedRuntime.runPromiseExit(effect);
    try {
      const data = unwrapExit(exit);
      return { data };
    } catch (error) {
      log.catch(error as Error);
      return { error: error as Error };
    }
  };

  private _resolveHandler(
    operation: Operation.Definition<any, any>,
  ): Effect.Effect<Operation.Handler<any, any, NoHandlerError, Operation.Service> | undefined> {
    return Effect.gen(this, function* () {
      const match = yield* this._getHandlers().pipe(
        Effect.map((handlers) => handlers.find((reg) => reg.meta.key === operation.meta.key)),
      );

      return match?.handler;
    });
  }

  /**
   * @internal
   * NOTE: Arrow function to preserve `this` context when destructured.
   */
  _invokeCore = <I, O>(
    op: Operation.Definition<I, O>,
    input: I,
    options?: Operation.InvokeOptions,
  ): Effect.Effect<O, NoHandlerError> => {
    return Effect.gen(this, function* () {
      const handler = yield* this._resolveHandler(op);
      if (!handler) {
        // TODO(burdon): Only throw in development mode.
        return yield* Effect.fail(new NoHandlerError(op.meta.key));
      }

      // TODO(burdon): Add debug flag to composer to enable this.
      log('invoke', { key: op.meta.key, input });

      // Build the effect with Operation.Service provided.
      let handlerEffect = handler(input).pipe(
        Effect.withSpan(op.meta.key),
        Effect.provideService(Operation.Service, {
          invoke: this.invoke,
          schedule: this._followupScheduler.schedule,
          invokePromise: this.invokePromise,
        }),
      );

      // Provide database context if spaceId is specified and we have a resolver.
      if (options?.spaceId && this._databaseResolver) {
        const dbContext = yield* this._databaseResolver(options.spaceId);
        handlerEffect = handlerEffect.pipe(Effect.provide(dbContext));
      }

      let output: O;

      // If the operation declares external services, use DynamicRuntime to resolve them.
      if (op.services && op.services.length > 0) {
        const dynamicRuntime = this._getDynamicRuntime(op.services);
        const runtime = yield* dynamicRuntime.runtimeEffect;
        output = yield* handlerEffect.pipe(Effect.provide(runtime.context));
      } else {
        output = yield* handlerEffect;
      }

      log('invocation completed', { key: op.meta.key, output });
      return output;
    }).pipe(
      Performance.addTrackEntry((exit) => ({
        name: op.meta.key,
        devtools: {
          dataType: 'track-entry',
          track: 'Operations',
          trackGroup: 'Composer',
          color: Exit.isSuccess(exit) ? 'tertiary-dark' : 'error-dark',
          properties: Exit.isFailure(exit) ? [['error', Cause.pretty(exit.cause)]] : undefined,
        },
      })),
    );
  };
}

//
// Factory
//

/**
 * Creates an OperationInvoker that resolves handlers and invokes operations.
 * Emits invocation events to subscribers after successful invocations.
 *
 * @param getHandlers - Function to get the list of operation handlers.
 * @param managedRuntime - Optional ManagedRuntime for providing services declared on operations.
 * @param databaseResolver - Optional function to resolve spaceId to database context.
 *
 * @example
 * ```ts
 * const invoker = OperationInvoker.make(() => Effect.succeed(handlers), managedRuntime);
 * const result = yield* invoker.invoke(MyOperation, { value: 42 });
 * ```
 *
 * @example With database resolver for space-specific context:
 * ```ts
 * const databaseResolver = (spaceId) => Effect.gen(function* () {
 *   const space = client.spaces.get(spaceId);
 *   return Context.make(Database.Service, Database.make(space.db));
 * });
 * const invoker = OperationInvoker.make(getHandlers, runtime, databaseResolver);
 * yield* invoker.invoke(MyOperation, { id: '123' }, { spaceId: 'space-id' });
 * ```
 */
export const make = (
  getHandlers: () => Effect.Effect<Operation.WithHandler<Operation.Definition.Any>[]>,
  managedRuntime: AnyManagedRuntime,
  databaseResolver?: DatabaseResolver,
): OperationInvokerInternal => {
  // Use a ref object so the closure can access the invoker after initialization.
  const ref: { invoker?: OperationInvokerImpl } = {};

  const invokeFn: Scheduler.InvokeFn = (op, input, options) => {
    if (!ref.invoker) {
      return Effect.fail(new InvokerNotInitializedError());
    }
    return ref.invoker._invokeCore(op, input, options);
  };

  const scheduler = Scheduler.make(invokeFn);
  ref.invoker = new OperationInvokerImpl(getHandlers, scheduler, managedRuntime, databaseResolver);
  return ref.invoker;
};
