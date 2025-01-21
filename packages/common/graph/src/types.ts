//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { type Specialize } from '@dxos/util';

export const BaseGraphNode = S.Struct({
  id: S.String,
  type: S.optional(S.String),

  // TODO(burdon): Remove. Can extend with arbitrary properties?
  data: S.optional(S.Any),
});

/** Raw base type. */
export type BaseGraphNode = S.Schema.Type<typeof BaseGraphNode>;

/** Typed node data. */
export type GraphNode<Data = any, Optional extends boolean = false> = Specialize<
  BaseGraphNode,
  Optional extends true ? { data?: Data } : { data: Data }
>;

export declare namespace GraphNode {
  export type Optional<T = any> = GraphNode<T, true>;
}

export const BaseGraphEdge = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  source: S.String,
  target: S.String,

  // TODO(burdon): Remove. Can extend with arbitrary properties?
  data: S.optional(S.Any),
});

/** Raw base type. */
export type BaseGraphEdge = S.Schema.Type<typeof BaseGraphEdge>;

/** Typed edge data. */
export type GraphEdge<Data = any, Optional extends boolean = false> = Specialize<
  BaseGraphEdge,
  Optional extends true ? { data?: Data } : { data: Data }
>;

export declare namespace GraphEdge {
  export type Optional<T = any> = GraphEdge<T, true>;
}

/**
 * Generic graph.
 */
export const Graph = S.Struct({
  id: S.optional(S.String),
  nodes: S.mutable(S.Array(BaseGraphNode)),
  edges: S.mutable(S.Array(BaseGraphEdge)),
});

export type Graph = S.Schema.Type<typeof Graph>;
