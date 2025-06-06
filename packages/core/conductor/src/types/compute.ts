//
// Copyright 2025 DXOS.org
//

import { type HttpClient } from '@effect/platform';
import { Effect, type Schema, type Scope } from 'effect';

import { mapValues } from '@dxos/util';

import type { ComputeNode } from './graph';
import type { EventLogger, FunctionCallService, GptService, QueueService, SpaceService } from '../services';

//
// Errors
//

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
 * A bag of values that can be fulfilled asynchronously and independently.
 * Represented as a set of effects (one per property).
 * We do that so that each input or output can be resolved independently.
 * This also handles control flow by providing a "not-executed" marker.
 * NOTE: Those effects cannot access requirements (logger, services, etc.).
 *
 * The whole bag itself can be a not-executed marker in case the entire node did not execute.
 */
export type ValueBag<T extends ValueRecord = ValueRecord> = {
  // TODO(dmaretskyi): Rename `_tag` to be consistent with effect.
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

/**
 * Unwraps the bag into a single effect.
 */
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
  node?: ComputeNode, // TODO(burdon): Why could node be undefined?
) => ComputeEffect<ValueBag<O>>;

export type ComputeRequirements =
  | HttpClient.HttpClient
  | EventLogger
  | QueueService
  | GptService
  | SpaceService
  | FunctionCallService
  | Scope.Scope;

/**
 * For results of compute functions.
 */
export type ComputeEffect<T> = Effect.Effect<T, Error | NotExecuted, ComputeRequirements>;

/**
 * Lifts a compute function that takes all inputs together and returns all outputs together.
 */
// TODO(burdon): Why could node be undefined?
// TODO(dmaretskyi): output schema needs to be passed in in-case the node does not execute to know the output property names to propagate not-executed marker further.
export const synchronizedComputeFunction =
  <I extends ValueRecord, O extends ValueRecord>(
    fn: (input: I, node?: ComputeNode) => ComputeEffect<O>,
  ): ComputeFunction<I, O> =>
  (inputBag, node) =>
    Effect.gen(function* () {
      const input = yield* unwrapValueBag(inputBag);
      const output = yield* fn(input, node);
      return makeValueBag<O>(output);
    });

// TODO(dmaretskyi): To effect schema.
export type ComputeMeta = {
  input: Schema.Schema.AnyNoContext;
  output: Schema.Schema.AnyNoContext;
};

/**
 *
 */
export type Executable<
  SI extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
  SO extends Schema.Schema.AnyNoContext = Schema.Schema.AnyNoContext,
> = {
  meta: ComputeMeta;

  /** Undefined for meta nodes like input/output. */
  exec?: ComputeFunction<Schema.Schema.Type<SI>, Schema.Schema.Type<SO>>;
};

/**
 * Type-safe constructor for function definition.
 */
export const defineComputeNode = <SI extends Schema.Schema.AnyNoContext, SO extends Schema.Schema.AnyNoContext>({
  input,
  output,
  exec,
}: {
  input: SI;
  output: SO;
  exec?: ComputeFunction<Schema.Schema.Type<SI>, Schema.Schema.Type<SO>>;
}): Executable => ({ meta: { input, output }, exec });
