//
// Copyright 2025 DXOS.org
//

import { Ref, type Ref$, S, TypedObject } from '@dxos/echo-schema';
import { BaseGraphNode, Graph } from '@dxos/graph';

/**
 * GraphNode payload.
 */
export const ComputeNode = S.Struct({
  /** DXN of the node specifier. */
  // TODO(burdon): Remove? Use type in base node class.
  type: S.optional(S.String),

  /** For composition nodes. */
  subgraph: S.optional(S.suspend((): Ref$<ComputeGraph> => Ref(ComputeGraph))),

  /** For switch nodes. */
  // TODO(dmaretskyi): Move to constants.
  enabled: S.optional(S.Boolean),

  /**
   * For constant nodes.
   */
  constant: S.optional(S.Any),
}).pipe(S.mutable);

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
  graph: Graph as S.Schema<Graph>, // Workaround for TS compiler bug.

  // Reference nodes.
  input: S.optional(BaseGraphNode),
  output: S.optional(BaseGraphNode),
}) {}

export const isComputeGraph = S.is(ComputeGraph);

/**
 * Well-known node types.
 */
export const NodeType = Object.freeze({
  Input: 'dxn:compute:input',
  Output: 'dxn:compute:output',

  Gpt: 'dxn:compute:gpt',
});
