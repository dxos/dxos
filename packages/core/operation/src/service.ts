//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import type { Key } from '@dxos/echo';

import type { Definition } from './operation';

/**
 * Options for operation invocation.
 */
export interface InvokeOptions {
  /** Space ID to provide database context for the handler. */
  spaceId?: Key.SpaceId;
}

/**
 * Operation service interface - provides unified access to operation invocation and scheduling.
 * This service is automatically provided to operation handlers.
 */
export interface OperationService {
  /**
   * Invoke an operation as an Effect.
   * Returns an Effect that resolves to the operation output.
   */
  invoke: <I, O>(
    op: Definition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ) => Effect.Effect<O, Error>;

  /**
   * Schedule an operation to run as a followup.
   * The followup is tracked and won't be cancelled when the parent operation completes.
   * Returns an Effect that completes immediately after scheduling.
   */
  schedule: <I, O>(op: Definition<I, O>, ...args: void extends I ? [input?: I] : [input: I]) => Effect.Effect<void>;

  /**
   * Invoke an operation and return a Promise.
   * Useful for async contexts where Effect is not available.
   */
  invokePromise: <I, O>(
    op: Definition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ) => Promise<{ data?: O; error?: Error }>;

  /**
   * Synchronously invoke an operation.
   * Only works for operations marked with `executionMode: 'sync'`.
   * Throws if the operation is async or if the handler performs async work.
   */
  invokeSync: <I, O>(
    op: Definition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ) => { data?: O; error?: Error };
}

/**
 * Context tag for the Operation service.
 * Operation handlers can yield this to invoke other operations or schedule followups.
 *
 * @example
 * ```ts
 * const handler = (input) => Effect.gen(function* () {
 *   // Schedule a followup (fire and forget)
 *   yield* Operation.schedule(AnalyticsOperation, { event: 'completed' });
 *
 *   // Invoke another operation
 *   return yield* Operation.invoke(OtherOperation, { data: input.data });
 * });
 * ```
 */
export class Service extends Context.Tag('@dxos/operation/Service')<Service, OperationService>() {}

//
// Namespace functions - ergonomic access to Operation.Service methods.
//

/**
 * Invoke an operation as an Effect.
 * Yields the Operation.Service internally.
 *
 * @example
 * ```ts
 * yield* Operation.invoke(MyOperation, { data: 'test' });
 * ```
 */
export const invoke = <I, O>(
  op: Definition<I, O>,
  ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
): Effect.Effect<O, Error, Service> =>
  Effect.flatMap(Service, (ops) => ops.invoke(op, ...(args as [I, InvokeOptions?])));

/**
 * Schedule an operation to run as a followup.
 * Yields the Operation.Service internally.
 *
 * @example
 * ```ts
 * yield* Operation.schedule(AnalyticsOperation, { event: 'completed' });
 * yield* Operation.schedule(VoidOperation); // input optional when void
 * ```
 */
export const schedule = <I, O>(
  op: Definition<I, O>,
  ...args: void extends I ? [input?: I] : [input: I]
): Effect.Effect<void, never, Service> => Effect.flatMap(Service, (ops) => ops.schedule(op, args[0] as I));
