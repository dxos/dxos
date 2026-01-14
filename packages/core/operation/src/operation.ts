//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Pipeable from 'effect/Pipeable';
import type * as Schema from 'effect/Schema';

import { type Type } from '@dxos/echo';

/**
 * Schema type that accepts any Encoded form but requires no Context.
 * This allows ECHO object schemas where Type !== Encoded due to [KindId] symbol.
 */
type OperationSchema<T> = Schema.Schema<T, any, never>;

/**
 * Serializable definition of an Operation.
 * Contains schema and metadata, but no runtime logic.
 */
export interface OperationDefinition<I, O> extends Pipeable.Pipeable {
  readonly schema: {
    readonly input: OperationSchema<I>;
    readonly output: OperationSchema<O>;
  };
  readonly meta: {
    readonly key: string;
    readonly name?: string;
    readonly description?: string;
    /**
     * Deployment ID for remote invocation.
     * Assigned by the EDGE function service when deployed.
     */
    readonly deployedId?: string;
  };
  /**
   * Execution mode for the operation.
   * - 'sync': Operation completes synchronously (fast, UI-blocking acceptable).
   * - 'async': Operation may take time (should not block UI).
   */
  readonly executionMode: 'sync' | 'async';

  /**
   * ECHO types the operation uses.
   * Ensures types are available when the operation is executed remotely.
   */
  readonly types?: readonly Type.Entity.Any[];

  /**
   * Effect services required by this operation.
   * These services will be automatically provided to the handler at invocation time.
   */
  readonly services?: readonly Context.Tag<any, any>[];
}

/**
 * Namespace for OperationDefinition helper types.
 */
export declare namespace OperationDefinition {
  /**
   * Any operation definition, regardless of input/output types.
   */
  export type Any = OperationDefinition<any, any>;

  /**
   * Extract the input type from an operation definition.
   */
  export type Input<T extends Any> = T extends OperationDefinition<infer I, any> ? I : never;

  /**
   * Extract the output type from an operation definition.
   */
  export type Output<T extends Any> = T extends OperationDefinition<any, infer O> ? O : never;

  /**
   * Extract the service identifier types from an operation's services array.
   * Returns `never` if the operation has no services declared.
   */
  export type Services<T> = T extends { services: readonly (infer Tags)[] }
    ? Tags extends Context.Tag<infer Id, any>
      ? Id
      : never
    : never;
}

/**
 * Runtime handler for an Operation.
 */
export type OperationHandler<I, O, E = Error, R = never> = (input: I) => Effect.Effect<O, E, R>;

/**
 * Props for creating an Operation definition.
 * Derived from OperationDefinition with executionMode made optional (defaults to 'async').
 */
export type OperationProps<I, O> = Omit<OperationDefinition<I, O>, 'pipe' | 'executionMode'> & {
  readonly executionMode?: 'sync' | 'async';
};

/**
 * The return type of Operation.make that preserves literal types while ensuring executionMode is set.
 */
type MakeResult<P extends OperationProps<any, any>> = Omit<P, 'executionMode'> &
  Pipeable.Pipeable & { readonly executionMode: 'sync' | 'async' };

/**
 * Creates a new Operation definition.
 * Applies default executionMode of 'async' if not specified.
 * The returned type preserves the literal types of props (including services).
 */
export const make = <const P extends OperationProps<any, any>>(props: P): MakeResult<P> => {
  return {
    ...props,
    executionMode: props.executionMode ?? 'async',
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return Pipeable.pipeArguments(this, arguments);
    },
  } as MakeResult<P>;
};

/**
 * Attaches a handler to an Operation definition.
 * The handler's required services (R) must be a subset of the services declared in the operation.
 * Dual API: can be called directly or used in a pipe.
 *
 * @example
 * ```ts
 * const MyOp = Operation.make({
 *   schema: { input: Schema.Void, output: Schema.Void },
 *   meta: { key: 'my-op' },
 *   services: [DatabaseService],
 * });
 *
 * // Direct call - handler can use DatabaseService
 * const op = Operation.withHandler(MyOp, (input) =>
 *   Effect.gen(function* () {
 *     const db = yield* DatabaseService;
 *     return {};
 *   }),
 * );
 *
 * // Piped call
 * const op = MyOp.pipe(Operation.withHandler((input) => Effect.succeed({})));
 * ```
 */
export function withHandler<Def extends OperationDefinition<any, any>, E = never>(
  handler: OperationHandler<
    OperationDefinition.Input<Def>,
    OperationDefinition.Output<Def>,
    E,
    OperationDefinition.Services<Def>
  >,
): (op: Def) => Def & { handler: typeof handler };
export function withHandler<Def extends OperationDefinition<any, any>, E = never>(
  op: Def,
  handler: OperationHandler<
    OperationDefinition.Input<Def>,
    OperationDefinition.Output<Def>,
    E,
    OperationDefinition.Services<Def>
  >,
): Def & { handler: typeof handler };
export function withHandler<Def extends OperationDefinition<any, any>, E = never>(
  opOrHandler:
    | Def
    | OperationHandler<
        OperationDefinition.Input<Def>,
        OperationDefinition.Output<Def>,
        E,
        OperationDefinition.Services<Def>
      >,
  handler?: OperationHandler<
    OperationDefinition.Input<Def>,
    OperationDefinition.Output<Def>,
    E,
    OperationDefinition.Services<Def>
  >,
):
  | (Def & {
      handler: OperationHandler<
        OperationDefinition.Input<Def>,
        OperationDefinition.Output<Def>,
        E,
        OperationDefinition.Services<Def>
      >;
    })
  | ((op: Def) => Def & {
      handler: OperationHandler<
        OperationDefinition.Input<Def>,
        OperationDefinition.Output<Def>,
        E,
        OperationDefinition.Services<Def>
      >;
    }) {
  // If called with just handler (piped usage).
  if (handler === undefined) {
    const handlerFn = opOrHandler as OperationHandler<
      OperationDefinition.Input<Def>,
      OperationDefinition.Output<Def>,
      E,
      OperationDefinition.Services<Def>
    >;
    return (op: Def) => ({
      ...op,
      handler: handlerFn,
    });
  }

  // If called with both op and handler (direct usage).
  const op = opOrHandler as Def;
  return {
    ...op,
    handler,
  };
}

//
// Invocation Interfaces
//

/**
 * Local invocation of an operation.
 */
export type Invoke = <I, O, E>(op: OperationDefinition<I, O>, input: I) => Effect.Effect<O, E>;

/**
 * Remote invocation of an operation.
 */
export type InvokeRemote = <I, O, E>(
  op: OperationDefinition<I, O>,
  input: I,
  options?: { timeout?: number },
) => Effect.Effect<O, E>;

//
// Re-export service types and functions for Operation namespace.
//

export {
  type InvokeOptions,
  type OperationService,
  Service,
  invoke,
  schedule,
  invokePromise,
  invokeSync,
} from './service';
