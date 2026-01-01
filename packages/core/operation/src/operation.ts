//
// Copyright 2025 DXOS.org
//

import type * as Effect from 'effect/Effect';
import * as Pipeable from 'effect/Pipeable';
import type * as Schema from 'effect/Schema';

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
  };
  readonly executionMode?: 'sync' | 'async';
}

/**
 * Runtime handler for an Operation.
 */
export type OperationHandler<I, O, E = Error, R = never> = (input: I) => Effect.Effect<O, E, R>;

/**
 * Props for creating an Operation definition.
 */
export interface OperationProps<I, O> {
  readonly schema: {
    readonly input: OperationSchema<I>;
    readonly output: OperationSchema<O>;
  };
  readonly meta: {
    readonly key: string;
    readonly name?: string;
    readonly description?: string;
  };
  readonly executionMode?: 'sync' | 'async';
}

/**
 * Creates a new Operation definition.
 */
export const make = <I, O>(props: OperationProps<I, O>): OperationDefinition<I, O> => {
  const op: OperationDefinition<I, O> = {
    ...props,
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return Pipeable.pipeArguments(this, arguments);
    },
  };
  return op;
};

/**
 * Attaches a handler to an Operation definition.
 * Dual API: can be called directly or used in a pipe.
 *
 * @example
 * ```ts
 * // Direct call
 * const op = Operation.withHandler(operation, handler);
 *
 * // Piped call
 * const op = operation.pipe(Operation.withHandler(handler));
 * ```
 */
export function withHandler<I, O, E = Error, R = never>(
  handler: OperationHandler<I, O, E, R>,
): (op: OperationDefinition<I, O>) => OperationDefinition<I, O> & { handler: OperationHandler<I, O, E, R> };
export function withHandler<I, O, E = Error, R = never>(
  op: OperationDefinition<I, O>,
  handler: OperationHandler<I, O, E, R>,
): OperationDefinition<I, O> & { handler: OperationHandler<I, O, E, R> };
export function withHandler<I, O, E = Error, R = never>(
  opOrHandler: OperationDefinition<I, O> | OperationHandler<I, O, E, R>,
  handler?: OperationHandler<I, O, E, R>,
):
  | (OperationDefinition<I, O> & { handler: OperationHandler<I, O, E, R> })
  | ((op: OperationDefinition<I, O>) => OperationDefinition<I, O> & { handler: OperationHandler<I, O, E, R> }) {
  // If called with just handler (piped usage)
  if (handler === undefined) {
    const handlerFn = opOrHandler as OperationHandler<I, O, E, R>;
    return (op: OperationDefinition<I, O>) => ({
      ...op,
      handler: handlerFn,
    });
  }

  // If called with both op and handler (direct usage)
  const op = opOrHandler as OperationDefinition<I, O>;
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
