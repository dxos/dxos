//
// Copyright 2025 DXOS.org
//

import type * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Pipeable from 'effect/Pipeable';
import type * as Schema$ from 'effect/Schema';

import { type Type } from '@dxos/echo';
import type * as Types from 'effect/Types';

// @import-as-namespace

/**
 * Schema type that accepts any Encoded form but requires no Context.
 * This allows ECHO object schemas where Type !== Encoded due to [KindId] symbol.
 */
type Schema<T> = Schema$.Schema<T, any, never>;

export const DefinitionTypeId = '~@dxos/operation/OperationDefinition' as const;
export type DefinitionTypeId = typeof DefinitionTypeId;

/**
 * Serializable definition of an Operation.
 * Contains schema and metadata, but no runtime logic.
 */
export interface Definition<I, O, S = any> extends Pipeable.Pipeable, Definition.Variance<I, O, S> {
  /**
   * Input schema for the operation.
   */
  readonly input: Schema<I>;
  /**
   * Output schema for the operation.
   */
  readonly output: Schema<O>;

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
  readonly types: readonly Type.AnyEntity[];

  /**
   * Effect services required by this operation.
   * These services will be automatically provided to the handler at invocation time.
   */
  readonly services: readonly Context.Tag<any, any>[];
}

/**
 * Namespace for OperationDefinition helper types.
 */
export declare namespace Definition {
  export interface Variance<I, O, S> {
    [DefinitionTypeId]: {
      readonly _Input: Types.Contravariant<I>;
      readonly _Output: Types.Covariant<O>;
      readonly _Services: Types.Covariant<S>;
    };
  }

  /**
   * Any operation definition, regardless of input/output types.
   */
  export type Any = Definition<any, any, any>;

  /**
   * Extract the input type from an operation definition.
   */
  export type Input<T extends Any> = T extends Variance<infer I, infer _O, infer _S> ? I : never;

  /**
   * Extract the output type from an operation definition.
   */
  export type Output<T extends Any> = T extends Variance<infer _I, infer O, infer _S> ? O : never;

  /**
   * Extract the service identifier types from an operation's services array.
   * Returns `never` if the operation has no services declared.
   */
  export type Services<T extends Any> = T extends Variance<infer _I, infer _O, infer S> ? S : never;

  export type HandlerType<T extends Any> =
    T extends Variance<infer I, infer O, infer S> ? Handler<I, O, any, S> : never;
}

/**
 * Runtime handler for an Operation.
 */
export type Handler<I, O, E = Error, R = never> = (input: I) => Effect.Effect<O, E, R>;

export type WithHandler<T extends Definition.Any> = T & {
  handler: Definition.HandlerType<T>;
};

/**a
 * Props for creating an Operation definition.
 * Derived from OperationDefinition with executionMode made optional (defaults to 'async').
 */
export type Props<I, O> = Omit<Definition<I, O>, DefinitionTypeId | 'pipe' | 'executionMode' | 'types' | 'services'> & {
  readonly executionMode?: 'sync' | 'async';
  readonly types?: Definition<I, O>['types'];
  readonly services?: Definition<I, O>['services'];
};

/**
 * Creates a new Operation definition.
 * Applies default executionMode of 'async' if not specified.
 * The returned type preserves the literal types of props (including services).
 */
export const make = <const P extends Props<any, any>>(
  props: P,
): Definition<
  Schema$.Schema.Type<P['input']>,
  Schema$.Schema.Type<P['output']>,
  Context.Tag.Identifier<NonNullable<P['services']>[number]>
> => {
  return {
    ...props,
    executionMode: props.executionMode ?? 'async',
    types: props.types ?? [],
    services: props.services ?? [],
    pipe() {
      // eslint-disable-next-line prefer-rest-params
      return Pipeable.pipeArguments(this, arguments);
    },
  } as any;
};

/**
 * Attaches a handler to an Operation definition.
 * The handler's required services (R) must be a subset of the services declared in the operation.
 * Dual API: can be called directly or used in a pipe.
 *
 * @example
 * ```ts
 * const MyOp = Operation.make({
 *   input: Schema.Void,
 *   output: Schema.Void,
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
export const withHandler: {
  <Def extends Definition<any, any>, E = never>(
    handler: Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def>>,
  ): (op: Def) => WithHandler<Def>;
  <Def extends Definition<any, any>, E = never>(
    op: Def,
    handler: Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def>>,
  ): WithHandler<Def>;
} = <Def extends Definition<any, any>, E = never>(
  opOrHandler: Def | Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def>>,
  handler?: Handler<Definition.Input<Def>, Definition.Output<Def>, E, Definition.Services<Def>>,
): WithHandler<Def> => {
  // If called with just handler (piped usage).
  if (handler === undefined) {
    const handlerFn = opOrHandler as Handler<
      Definition.Input<Def>,
      Definition.Output<Def>,
      E,
      Definition.Services<Def>
    >;
    return ((op: Def) => ({
      ...op,
      handler: handlerFn,
    })) as any;
  }

  // If called with both op and handler (direct usage).
  const op = opOrHandler as Def;
  return {
    ...op,
    handler,
  } as any;
};

//
// Invocation Interfaces
//

/**
 * Local invocation of an operation.
 */
export type Invoke = <I, O, E>(op: Definition<I, O>, input: I) => Effect.Effect<O, E>;

/**
 * Remote invocation of an operation.
 */
export type InvokeRemote = <I, O, E>(
  op: Definition<I, O>,
  input: I,
  options?: { timeout?: number },
) => Effect.Effect<O, E>;

//
// Re-export service types and functions for Operation namespace.
//

export { type InvokeOptions, type OperationService, Service, invoke, schedule } from './service';
