//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import type * as ManagedRuntime from 'effect/ManagedRuntime';
import * as PubSub from 'effect/PubSub';

import type { Key } from '@dxos/echo';
import { DynamicRuntime, runAndForwardErrors } from '@dxos/effect';
import { log } from '@dxos/log';
import type { OperationDefinition, OperationHandler } from '@dxos/operation';
import { byPosition } from '@dxos/util';

import { NoHandlerError } from './errors';
import * as FollowupScheduler from './followup-scheduler';
import type { OperationResolver } from './operation-resolver';

/**
 * Invocation event emitted after each operation.
 */
export type InvocationEvent<I = any, O = any> = {
  operation: OperationDefinition<I, O>;
  input: I;
  output: O;
  timestamp: number;
};

/**
 * Options for operation invocation.
 */
export interface InvokeOptions {
  /** Space ID to provide database context for the handler. */
  spaceId?: Key.SpaceId;
}

/**
 * Resolves a spaceId to a context containing Database.Service.
 * Provided by the caller to avoid coupling app-framework to client/echo.
 */
export type DatabaseResolver = (spaceId: Key.SpaceId) => Effect.Effect<Context.Context<any>, Error>;

//
// Public Interface
//

/**
 * OperationInvoker interface - resolves and executes operations.
 */
export interface OperationInvoker {
  invoke: <I, O>(
    op: OperationDefinition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ) => Effect.Effect<O, Error>;
  invokePromise: <I, O>(
    op: OperationDefinition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ) => Promise<{ data?: O; error?: Error }>;
  /** @internal */
  _invokeCore: <I, O>(op: OperationDefinition<I, O>, input: I, options?: InvokeOptions) => Effect.Effect<O, Error>;
  /** Effect stream of invocation events. */
  invocations: PubSub.PubSub<InvocationEvent>;
  /** Number of pending followup operations. */
  pendingFollowups: Effect.Effect<number>;
  /** Wait for all pending followups to complete. */
  awaitFollowups: Effect.Effect<void>;
}

//
// Internal Implementation
//

type AnyManagedRuntime = ManagedRuntime.ManagedRuntime<any, any>;

class OperationInvokerImpl implements OperationInvoker {
  private readonly _pubsub: PubSub.PubSub<InvocationEvent>;
  private readonly _getHandlers: () => Effect.Effect<OperationResolver<any, any, Error, any>[], Error>;
  private readonly _followupScheduler: FollowupScheduler.FollowupScheduler;
  private readonly _managedRuntime?: AnyManagedRuntime;
  private readonly _databaseResolver?: DatabaseResolver;

  constructor(
    getHandlers: () => Effect.Effect<OperationResolver<any, any, Error, any>[], Error>,
    followupScheduler: FollowupScheduler.FollowupScheduler,
    managedRuntime?: AnyManagedRuntime,
    databaseResolver?: DatabaseResolver,
  ) {
    this._getHandlers = getHandlers;
    this._pubsub = Effect.runSync(PubSub.unbounded<InvocationEvent>());
    this._followupScheduler = followupScheduler;
    this._managedRuntime = managedRuntime;
    this._databaseResolver = databaseResolver;
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
  invoke = <I, O>(
    op: OperationDefinition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ): Effect.Effect<O, Error> => {
    const input = args[0] as I;
    const options = args[1] as InvokeOptions | undefined;
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
    op: OperationDefinition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ): Promise<{ data?: O; error?: Error }> => {
    return runAndForwardErrors(this.invoke(op, ...args))
      .then((data) => ({ data }))
      .catch((error) => {
        log.catch(error);
        return { error };
      });
  };

  private _resolveHandler(
    operation: OperationDefinition<any, any>,
    input: any,
  ): Effect.Effect<OperationHandler<any, any, Error, FollowupScheduler.Service> | undefined, Error> {
    return Effect.gen(this, function* () {
      const candidates = yield* this._getHandlers().pipe(
        Effect.map((handlers) => handlers.filter((reg) => reg.operation.meta.key === operation.meta.key)),
        Effect.map((handlers) => handlers.filter((reg) => !reg.filter || reg.filter(input))),
        Effect.map((handlers) => handlers.toSorted(byPosition)),
      );

      if (candidates.length === 0) {
        return undefined;
      }

      return candidates[0].handler;
    });
  }

  /** @internal */
  // Arrow function to preserve `this` context when destructured.
  _invokeCore = <I, O>(op: OperationDefinition<I, O>, input: I, options?: InvokeOptions): Effect.Effect<O, Error> => {
    return Effect.gen(this, function* () {
      const handler = yield* this._resolveHandler(op, input);
      if (!handler) {
        return yield* Effect.fail(new NoHandlerError(op.meta.key));
      }

      log('invoking operation', { key: op.meta.key, input });

      // Build the effect with FollowupScheduler provided.
      let handlerEffect = handler(input).pipe(
        Effect.provideService(FollowupScheduler.Service, this._followupScheduler),
      );

      // Provide database context if spaceId is specified and we have a resolver.
      if (options?.spaceId && this._databaseResolver) {
        const dbContext = yield* this._databaseResolver(options.spaceId);
        handlerEffect = handlerEffect.pipe(Effect.provide(dbContext));
      }

      let output: O;

      // If the operation declares services and we have a ManagedRuntime, use DynamicRuntime.
      if (op.services && op.services.length > 0 && this._managedRuntime) {
        // Create a DynamicRuntime with the operation's declared services.
        // Cast to DynamicRuntime<[]> to allow any effect - runtime validation handles the actual check.
        const dynamicRuntime = DynamicRuntime.make(this._managedRuntime, op.services) as DynamicRuntime.DynamicRuntime<
          []
        >;
        // Get the runtime and provide its context to the handler effect.
        const runtime = yield* dynamicRuntime.runtimeEffect;
        output = yield* handlerEffect.pipe(Effect.provide(runtime.context));
      } else {
        // No services declared or no runtime available - run directly.
        output = yield* handlerEffect;
      }

      log('operation completed', { key: op.meta.key, output });

      return output;
    });
  };
}

//
// Factory
//

/**
 * Creates an OperationInvoker that resolves handlers and invokes operations.
 * Emits invocation events to subscribers after successful invocations.
 *
 * @param getHandlers - Function to get the list of operation resolvers.
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
 *   return Context.make(Database.Service, Database.Service.make(space.db));
 * });
 * const invoker = OperationInvoker.make(getHandlers, runtime, databaseResolver);
 * yield* invoker.invoke(MyOperation, { id: '123' }, { spaceId: 'space-id' });
 * ```
 */
export const make = (
  getHandlers: () => Effect.Effect<OperationResolver<any, any, Error, any>[], Error>,
  managedRuntime?: AnyManagedRuntime,
  databaseResolver?: DatabaseResolver,
): OperationInvoker => {
  // Use a ref object so the closure can access the invoker after initialization.
  const ref: { invoker?: OperationInvokerImpl } = {};

  const invokeFn: FollowupScheduler.InvokeFn = (op, input, options) => {
    if (!ref.invoker) {
      return Effect.die(new Error('Invoker not initialized'));
    }
    return ref.invoker._invokeCore(op, input, options);
  };

  const scheduler = FollowupScheduler.make(invokeFn);
  ref.invoker = new OperationInvokerImpl(getHandlers, scheduler, managedRuntime, databaseResolver);
  return ref.invoker;
};
