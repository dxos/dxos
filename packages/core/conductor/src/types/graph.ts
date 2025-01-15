//
// Copyright 2025 DXOS.org
//

import { Ref, type Ref$, S, TypedObject } from '@dxos/echo-schema';
import { Graph } from '@dxos/graph';

/**
 * GraphNode payload.
 */
export const ComputeNode = S.Struct({
  /** DXN of the node specifier. */
  // TODO(burdon): Remove? Use type in base node class. Generalize type.
  type: S.optional(S.String),

  /** For composition nodes. */
  subgraph: S.optional(S.suspend((): Ref$<ComputeGraph> => Ref(ComputeGraph))),

  /** For switch nodes. */
  // TODO(dmaretskyi): Move to constants.
  enabled: S.optional(S.Boolean),
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

  // TODO(burdon): ???
  Gpt: 'dxn:compute:gpt',
});

export class ComputeGraph extends TypedObject({
  typename: 'dxos.org/type/ComputeGraph',
  version: '0.1.0',
})({
  graph: Graph,

  // TODO(burdon): Are these required or just used for references?
  input: S.optional(ComputeNode),
  output: S.optional(ComputeNode),
}) {}

export const isComputeGraph = S.is(ComputeGraph);
