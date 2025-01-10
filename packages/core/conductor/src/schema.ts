//
// Copyright 2025 DXOS.org
//

import { type Effect, type Scope } from 'effect';

import { S } from '@dxos/echo-schema';

import type { EventLogger } from './services/event-logger';
import type { GraphModel } from '@dxos/graph';
import type { GraphEdge } from '@dxos/graph';
import type { GraphNode } from '@dxos/graph';
import type { GptService } from './services/gpt';

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
  /** Input property. */
  input: S.String,

  /** Output property. */
  output: S.String,
});

export type ComputeEdge = S.Schema.Type<typeof ComputeEdge>;

/**
 * Bag of effects. One per output property.
 */
export type OutputBag<O> = { [K in keyof O]: O[K] | Effect.Effect<O[K], Error, never> };

/**
 * Node function.
 */
export type ComputeFunction<I, O> = (input: I) => Effect.Effect<OutputBag<O>, Error, ComputeRequirements>;

export type ComputeRequirements = EventLogger | GptService | Scope.Scope;

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
  Input: 'dxn:graph:input',
  Output: 'dxn:graph:output',
  Gpt: 'dxn:graph:gpt',
});

export type ComputeGraph = GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>;
