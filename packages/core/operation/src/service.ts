//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';

import type { DXN, Key } from '@dxos/echo';

import type { NoHandlerError } from './errors';
import type * as Operation from './Operation';

/**
 * Options for operation invocation.
 */
export interface InvokeOptions {
  /** Space ID to provide database context for the handler. */
  spaceId?: Key.SpaceId;
  /**
   * DXN string of the conversation feed (queue). Passed to the process environment so nested operations
   * can resolve AiContextService and related services.
   */
  conversation?: DXN.String;
  /** Optional process-runtime tracing metadata (consumed by `@dxos/functions-runtime` when wired). */
  tracing?: unknown;
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
    op: Operation.Definition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
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

  /**
   * Invoke an operation and return a Promise.
   * Useful for async contexts where Effect is not available.
   */
  invokePromise: <I, O>(
    op: Operation.Definition<I, O>,
    ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
  ) => Promise<{ data?: O; error?: Error }>;
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
// TODO(dmaretskyi): Rename Operation.Invoker
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
  op: Operation.Definition<I, O>,
  ...args: void extends I ? [input?: I, options?: InvokeOptions] : [input: I, options?: InvokeOptions]
): Effect.Effect<O, NoHandlerError, Service> =>
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
  op: Operation.Definition<I, O>,
  ...args: void extends I ? [input?: I] : [input: I]
): Effect.Effect<void, never, Service> => Effect.flatMap(Service, (ops) => ops.schedule(op, args[0] as I));
