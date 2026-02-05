//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';

import { type ComputeEventLogger } from '@dxos/functions';
import { type FunctionServices } from '@dxos/functions';
import { mapValues } from '@dxos/util';

import { type ComputeNode, type ComputeNodeMeta } from './graph';

//
// Errors
//

export type NotExecuted = { kind: 'not-executed' };

export const NotExecuted: NotExecuted = { kind: 'not-executed' };

export const isNotExecuted = (value: any): value is NotExecuted => value.kind === 'not-executed';

// TODO(dmaretskyi): Type this better.
export type ConductorError = Error | NotExecuted;

//
// Values
//

export type ValueRecord = Record<string, unknown>;

/**
 * For individual values passed through the compute function.
 */
export type ValueEffect<T> = Effect.Effect<T, ConductorError, never>;

/**
 * A bag of values that can be fulfilled asynchronously and independently.
 * Represented as a set of effects (one per property).
 * We do that so that each input or output can be resolved independently.
 * This also handles control flow by providing a "not-executed" marker.
 * NOTE: Those effects cannot access requirements (logger, services, etc.).
 *
 * The whole bag itself can be a not-executed marker in case the entire node did not execute.
 */
// TODO(burdon): Rename.
export type ValueBag<T extends ValueRecord = ValueRecord> = {
  _tag: 'ValueBag';
  values: {
    [K in keyof T]: ValueEffect<T[K]>;
  };
};

export const ValueBag = Object.freeze({
  isValueBag: (value: any): value is ValueBag => value._tag === 'ValueBag',

  make: <T extends ValueRecord>(values: {
    [K in keyof T]: T[K] | ValueEffect<T[K]>;
  }): ValueBag<T> => ({
    _tag: 'ValueBag',
    values: mapValues(values as any, (value) => (Effect.isEffect(value) ? value : Effect.succeed(value))) as any,
  }),

  get: <T extends ValueRecord>(bag: ValueBag<T>, key: keyof T): ValueEffect<T[typeof key]> => {
    return bag.values[key];
  },

  /**
   * Unwraps the bag into a single effect.
   */
  unwrap: <T extends ValueRecord>(bag: ValueBag<T>): ValueEffect<T> => {
    if (isNotExecuted(bag)) {
      return Effect.fail(NotExecuted);
    }

    return Effect.all(
      Object.entries(bag.values as Record<string, ValueEffect<any>>).map(([key, eff]) =>
        eff.pipe(Effect.map((value) => [key, value] as const)),
      ),
    ).pipe(Effect.map((entries) => Object.fromEntries(entries) as T));
  },

  /**
   * Map over the value effects in the bag.
   */
  map: (
    bag: ValueBag<Record<string, unknown>>,
    fn: (value: ValueEffect<unknown>, key: string) => ValueEffect<unknown>,
  ): ValueBag<Record<string, unknown>> => {
    return ValueBag.make(mapValues(bag.values, (value, key) => fn(value, key)));
  },
});

//
// Functions
//

export type ComputeRequirements = FunctionServices | ComputeEventLogger | Scope.Scope;

/**
 * For results of compute functions.
 */
export type ComputeResult<T> = Effect.Effect<T, ConductorError, ComputeRequirements>;

/**
 * Node function.
 * Note that not-executed markers must be in the output bag.
 */
export type ComputeFunction<Input extends ValueRecord, Output extends ValueRecord> = (
  input: ValueBag<Input>,
  node?: ComputeNode, // TODO(burdon): Undefined?
) => ComputeResult<ValueBag<Output>>;

/**
 * @internal
 */
// TODO(burdon): Reconcile with @effect/ai/Tool and handler.
export type NodeDef<Input extends Schema.Schema.AnyNoContext, Ouput extends Schema.Schema.AnyNoContext> = {
  input: Input;
  output: Ouput;
  exec?: ComputeFunction<Schema.Schema.Type<Input>, Schema.Schema.Type<Ouput>>;
};

/**
 * Executable node.
 */
// TODO(burdon): Handler.
export type Executable<
  Input extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  Output extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
> = {
  meta: ComputeNodeMeta;

  /** Undefined for meta nodes like input/output. */
  exec?: ComputeFunction<Schema.Schema.Type<Input>, Schema.Schema.Type<Output>>;
};

/**
 * Type-safe constructor for function definition.
 */
// TODO(burdon): make
export const defineComputeNode = <Input extends Schema.Schema.AnyNoContext, Output extends Schema.Schema.AnyNoContext>({
  input,
  output,
  exec,
}: NodeDef<Input, Output>): Executable<Input, Output> => ({ meta: { input, output }, exec });

/**
 * Lifts a compute function that takes all inputs together and returns all outputs together.
 */
// TODO(dmaretskyi): Output schema needs to be passed in in-case the node does not execute in order to know the output property names to propagate not-executed marker further.
export const synchronizedComputeFunction =
  <Input extends ValueRecord, Ouput extends ValueRecord>(
    fn: (input: Input, node?: ComputeNode) => ComputeResult<Ouput>,
  ): ComputeFunction<Input, Ouput> =>
  (inputBag, node) =>
    Effect.gen(function* () {
      const input = yield* ValueBag.unwrap(inputBag);
      const output = yield* fn(input, node);
      return ValueBag.make<Ouput>(output);
    });
