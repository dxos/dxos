//
// Copyright 2025 DXOS.org
//

import { Ref, type Ref$, S, TypedObject } from '@dxos/echo-schema';
import { BaseGraphNode, Graph } from '@dxos/graph';

/**
 * GraphNode payload.
 */
export const ComputeNode = S.mutable(
  S.Struct({
    /** DXN of the node specifier. */
    // TODO(burdon): Remove? Use type in base node class.
    type: S.optional(S.String),

    /**
     * NOTE: Rather than a discriminated union, we have a mixin of properties for different node types.
     */

    /** For composition nodes. */
    subgraph: S.optional(S.suspend((): Ref$<ComputeGraph> => Ref(ComputeGraph))),

    /** For switch nodes. */
    enabled: S.optional(S.Boolean),

    /** For constant nodes. */
    value: S.optional(S.Any),
  }),
);

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

/**
 * Persistent graph.
 */
export class ComputeGraph extends TypedObject({
  typename: 'dxos.org/type/ComputeGraph',
  version: '0.1.0',
})({
  // Workaround for TS compiler bug.
  graph: Graph as S.Schema<Graph>,

  // Reference nodes.
  input: S.optional(BaseGraphNode),
  output: S.optional(BaseGraphNode),
}) {}

export const isComputeGraph = S.is(ComputeGraph);
