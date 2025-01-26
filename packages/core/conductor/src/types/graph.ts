//
// Copyright 2025 DXOS.org
//

import { Ref, type Ref$, S, TypedObject } from '@dxos/echo-schema';
import { BaseGraphEdge, BaseGraphNode, Graph } from '@dxos/graph';

/**
 * GraphNode payload.
 */
export const ComputeNode = S.extend(
  BaseGraphNode,

  /**
   * NOTE: We have a mixin of properties for different node types for simplicity,rather than a discriminated union.
   */
  S.Struct({
    /** For constant nodes. */
    value: S.optional(S.Any),

    /** For composition nodes. */
    subgraph: S.optional(S.suspend((): Ref$<ComputeGraph> => Ref(ComputeGraph))),

    /** For switch nodes. */
    enabled: S.optional(S.Boolean),
  }),
).pipe(S.mutable);

export type ComputeNode = S.Schema.Type<typeof ComputeNode>;

/**
 * GraphEdge payload.
 */
export const ComputeEdge = S.extend(
  BaseGraphEdge,
  S.Struct({
    /** Output property from source. */
    output: S.String,

    /** Input property to target. */
    input: S.String,
  }),
);

export type ComputeEdge = S.Schema.Type<typeof ComputeEdge>;

/**
 * Persistent graph.
 */
export class ComputeGraph extends TypedObject({
  typename: 'dxos.org/type/ComputeGraph',
  version: '0.1.0',
})({
  // NOTE: Cast required as workaround for TS compiler bug.
  graph: Graph as S.Schema<Graph>,

  // Reference nodes.
  input: S.optional(BaseGraphNode),
  output: S.optional(BaseGraphNode),
}) {}

export const isComputeGraph = S.is(ComputeGraph);
