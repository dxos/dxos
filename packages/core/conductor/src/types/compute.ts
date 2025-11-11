//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';

import type { Services } from '@dxos/functions';
import { mapValues } from '@dxos/util';

import type { ComputeNode } from './graph';

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

/**
 * Node function.
 * Note that not-executed markers must be in the output bag.
 */
export type ComputeFunction<I extends ValueRecord, O extends ValueRecord> = (
  input: ValueBag<I>,
  node?: ComputeNode, // TODO(burdon): Undefined?
) => ComputeEffect<ValueBag<O>>;

export type ComputeRequirements = Services | Scope.Scope;

/**
 * For results of compute functions.
 */
export type ComputeEffect<T> = Effect.Effect<T, ConductorError, ComputeRequirements>;

/**
 * Lifts a compute function that takes all inputs together and returns all outputs together.
 */
// TODO(dmaretskyi): output schema needs to be passed in in-case the node does not execute to know the output property names to propagate not-executed marker further.
export const synchronizedComputeFunction =
  <I extends ValueRecord, O extends ValueRecord>(
    fn: (input: I, node?: ComputeNode) => ComputeEffect<O>,
  ): ComputeFunction<I, O> =>
  (inputBag, node) =>
    Effect.gen(function* () {
      const input = yield* ValueBag.unwrap(inputBag);
      const output = yield* fn(input, node);
      return ValueBag.make<O>(output);
    });

// TODO(dmaretskyi): To effect schema.
export type ComputeMeta = {
  type: string;
  input: Schema.Schema.AnyNoContext;
  output: Schema.Schema.AnyNoContext;
};

/**
 * Executable node.
 */
export type Executable<
  SI extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  SO extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
> = {
  meta: ComputeMeta;

  /** Undefined for meta nodes like input/output. */
  exec?: ComputeFunction<Schema.Schema.Type<SI>, Schema.Schema.Type<SO>>;
};

export type NodeDef<SI extends Schema.Schema.AnyNoContext, SO extends Schema.Schema.AnyNoContext> = {
  type: string;
  input: SI;
  output: SO;
  exec?: ComputeFunction<Schema.Schema.Type<SI>, Schema.Schema.Type<SO>>;
};

/**
 * Type-safe constructor for function definition.
 */
export const defineComputeNode = <SI extends Schema.Schema.AnyNoContext, SO extends Schema.Schema.AnyNoContext>({
  type,
  input,
  output,
  exec,
}: NodeDef<SI, SO>): Executable<SI, SO> => ({ meta: { type, input, output }, exec });
