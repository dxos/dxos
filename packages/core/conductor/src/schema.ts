//
// Copyright 2025 DXOS.org
//

import { Effect, type Scope } from 'effect';

import { S } from '@dxos/echo-schema';
import type { GraphModel, GraphEdge, GraphNode } from '@dxos/graph';
import { mapValues } from '@dxos/util';

import type { EventLogger, GptService } from './services';

/**
 * GraphNode payload.
 */
export const ComputeNode = S.Struct({
  /** DXN of the node specifier. */
  // TODO(burdon): Type property exists on base GraphNode.
  type: S.String,
});

export type ComputeNode = S.Schema.Type<typeof ComputeNode>;

/**
 * GraphEdge payload.
 */
export const ComputeEdge = S.Struct({
  /** Output property from source. */
  output: S.String,

  /** Input property to target. */
  input: S.String,
});

export type ComputeEdge = S.Schema.Type<typeof ComputeEdge>;

type ValueRecord = Record<string, any>;

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

/**
 * Node function.
 * Note that not-executed markers must be in the output bag.
 */
export type ComputeFunction<I extends ValueRecord, O extends ValueRecord> = (
  input: ValueBag<I>,
) => ComputeEffect<ValueBag<O>>;

export type NotExecuted = { kind: 'not-executed' };
export const NotExecuted: NotExecuted = { kind: 'not-executed' };
export const isNotExecuted = (value: any): value is NotExecuted => value.kind === 'not-executed';

export type ComputeRequirements = EventLogger | GptService | Scope.Scope;

/**
 * For results of compute functions.
 */
export type ComputeEffect<T> = Effect.Effect<T, Error | NotExecuted, ComputeRequirements>;

/**
 * For individual values passed through the compute function.
 */
export type ValueEffect<T> = Effect.Effect<T, Error | NotExecuted, never>;

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

export type ComputeImplementation<
  SI extends S.Schema.AnyNoContext = S.Schema.AnyNoContext,
  SO extends S.Schema.AnyNoContext = S.Schema.AnyNoContext,
> = {
  // TODO(burdon): Why meta?
  meta: ComputeMeta;

  /** Undefined for meta nodes like input/output. */
  compute?: ComputeFunction<S.Schema.Type<SI>, S.Schema.Type<SO>>;
};

export const defineComputeNode = <SI extends S.Schema.AnyNoContext, SO extends S.Schema.AnyNoContext>({
  input,
  output,
  compute,
}: {
  input: SI;
  output: SO;
  compute?: ComputeFunction<S.Schema.Type<SI>, S.Schema.Type<SO>>;
}): ComputeImplementation => ({
  meta: { input, output },
  compute,
});

/**
 * Well-known node types.
 */
export const NodeType = Object.freeze({
  Input: 'dxn:compute:input',
  Output: 'dxn:compute:output',
  Gpt: 'dxn:compute:gpt',
});

export type ComputeGraph = GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>;
