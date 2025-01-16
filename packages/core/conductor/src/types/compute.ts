//
// Copyright 2025 DXOS.org
//

import { Effect, type Scope } from 'effect';

import { type S } from '@dxos/echo-schema';
import { mapValues } from '@dxos/util';

// TODO(burdon): Move to types to untangle circular deps.
import type { EventLogger, GptService } from '../services';
import type { ComputeNode } from './graph';
import type { GraphNode } from '@dxos/graph';

export type NotExecuted = { kind: 'not-executed' };
export const NotExecuted: NotExecuted = { kind: 'not-executed' };
export const isNotExecuted = (value: any): value is NotExecuted => value.kind === 'not-executed';

//
// Values
//

export type ValueRecord = Record<string, any>;

/**
 * For individual values passed through the compute function.
 */
export type ValueEffect<T> = Effect.Effect<T, Error | NotExecuted, never>;

/**
 * Bag of effects that defines node's inputs or outputs.
 * One per property.
 * We do that so that each input or output can be resolved independently.
 * This also handles control flow by providing a "not-executed" marker.
 * NOTE: Those effects cannot access requirements (logger, services, etc.).
 *
 * The whole bag itself can be a not-executed marker in case the entire node did not execute.
 */
export type ValueBag<T extends ValueRecord = ValueRecord> = {
  type: 'bag';
  values: {
    [K in keyof T]: ValueEffect<T[K]>;
  };
};
export const isValueBag = (value: any): value is ValueBag => value.type === 'bag';

export const makeValueBag = <T extends ValueRecord>(values: {
  [K in keyof T]: T[K] | ValueEffect<T[K]>;
}): ValueBag<T> => ({
  type: 'bag',
  values: mapValues(values as any, (value) => (Effect.isEffect(value) ? value : Effect.succeed(value))) as any,
});

export const unwrapValueBag = <T extends ValueRecord>(bag: ValueBag<T>): ValueEffect<T> => {
  if (isNotExecuted(bag)) {
    return Effect.fail(NotExecuted);
  }

  return Effect.all(
    Object.entries(bag.values as Record<string, ValueEffect<any>>).map(([key, eff]) =>
      eff.pipe(Effect.map((value) => [key, value] as const)),
    ),
  ).pipe(Effect.map((entries) => Object.fromEntries(entries) as T));
};

//
// Functions
//

/**
 * Node function.
 * Note that not-executed markers must be in the output bag.
 */
export type ComputeFunction<I extends ValueRecord, O extends ValueRecord> = (
  input: ValueBag<I>,
  node: ComputeNode,
) => ComputeEffect<ValueBag<O>>;

export type ComputeRequirements = EventLogger | GptService | Scope.Scope;

/**
 * For results of compute functions.
 */
export type ComputeEffect<T> = Effect.Effect<T, Error | NotExecuted, ComputeRequirements>;

/**
 * Lifts a compute function that takes all inputs together and returns all outputs together.
 */
// TODO(dmaretskyi): output schema needs to be passed in in-case the node does not execute to know the output property names to propagate not-executed marker further.
export const synchronizedComputeFunction = <I extends ValueRecord, O extends ValueRecord>(
  fn: (input: I) => ComputeEffect<O>,
): ComputeFunction<I, O> => {
  return (inputBag) =>
    Effect.gen(function* () {
      const input = yield* unwrapValueBag(inputBag);
      const output = yield* fn(input);
      return makeValueBag<O>(output);
    });
};

// TODO(dmaretskyi): To effect schema.
export type ComputeMeta = {
  input: S.Schema.AnyNoContext;
  output: S.Schema.AnyNoContext;
};

/**
 *
 */
export type Executable<
  SI extends S.Schema.AnyNoContext = S.Schema.AnyNoContext,
  SO extends S.Schema.AnyNoContext = S.Schema.AnyNoContext,
> = {
  meta: ComputeMeta;

  /** Undefined for meta nodes like input/output. */
  exec?: ComputeFunction<S.Schema.Type<SI>, S.Schema.Type<SO>>;
};

/**
 * Type-safe constructor for function definition.
 */
export const defineComputeNode = <SI extends S.Schema.AnyNoContext, SO extends S.Schema.AnyNoContext>({
  input,
  output,
  exec,
}: {
  input: SI;
  output: SO;
  exec?: ComputeFunction<S.Schema.Type<SI>, S.Schema.Type<SO>>;
}): Executable => ({ meta: { input, output }, exec });
