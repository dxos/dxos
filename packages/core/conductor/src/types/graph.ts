//
// Copyright 2025 DXOS.org
//

import { JsonSchemaType, Ref, type Ref$, S, TypedObject } from '@dxos/echo-schema';
import { BaseGraphEdge, BaseGraphNode, Graph } from '@dxos/graph';

/**
 * GraphNode.
 */
export const ComputeNode = S.extend(
  BaseGraphNode,

  /**
   * NOTE: We have a mixin of properties for different node types for simplicity,rather than a discriminated union.
   */
  // TODO(burdon): Split out into different types.
  S.Struct({
    /** For template nodes. */
    // TODO(dmaretskyi): Compute at runtime -- don't persist.
    inputSchema: S.optional(JsonSchemaType),
    outputSchema: S.optional(JsonSchemaType),

    /** For composition nodes. */
    subgraph: S.optional(S.suspend((): Ref$<ComputeGraph> => Ref(ComputeGraph))),

    /** For constant and template nodes. */
    value: S.optional(S.Any),

    /** For switch nodes. */
    // TODO(dmaretskyi): Reuse `value`.
    enabled: S.optional(S.Boolean),
  }),
).pipe(S.mutable);

export type ComputeNode = S.Schema.Type<typeof ComputeNode>;

/**
 * GraphEdge.
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
