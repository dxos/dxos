//
// Copyright 2025 DXOS.org
//

import { Ref, S, TypedObject } from '@dxos/echo-schema';
import { type GraphModel, type GraphEdge, type GraphNode, Graph } from '@dxos/graph';

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

/**
 * Well-known node types.
 */
export const NodeType = Object.freeze({
  Input: 'dxn:compute:input',
  Output: 'dxn:compute:output',
  Gpt: 'dxn:compute:gpt',
});

// TODO(burdon): Reconcile with ComputeGraphModel.
export type ComputeGraph = GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>;

// TODO(burdon): Rename.
export class ComputeGraphType extends TypedObject({
  typename: 'dxos.org/type/ComputeGraph',
  version: '0.1.0',
})({
  graph: Graph,

  // TODO(burdon): Are these required or just used for references?
  input: S.optional(ComputeNode),
  output: S.optional(ComputeNode),
}) {}

export const isComputeGraph = S.is(ComputeGraphType);

// TODO(burdon): Reconcile/merge with ComputeNode.
export const ComputeGraphNode = S.Struct({
  type: S.optional(S.String),

  /** For composition nodes. */
  subgraph: S.optional(Ref(ComputeGraphType)),

  /** For switch nodes. */
  // TODO(dmaretskyi): Move to constants.
  enabled: S.optional(S.Boolean),
});

export type ComputeGraphNode = S.Schema.Type<typeof ComputeGraphNode>;
