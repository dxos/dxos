//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { type Specialize } from '@dxos/util';

export const BaseGraphNode = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  data: S.optional(S.Any),
});

/** Raw base type. */
export type BaseGraphNode = S.Schema.Type<typeof BaseGraphNode>;

/** Typed node data. */
export type GraphNode<Data = any, Optional extends boolean = false> = Specialize<
  BaseGraphNode,
  Optional extends true ? { data?: Data } : { data: Data }
>;

export const BaseGraphEdge = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  source: S.String,
  target: S.String,
  data: S.optional(S.Any),
});

/** Raw base type. */
export type BaseGraphEdge = S.Schema.Type<typeof BaseGraphEdge>;

/** Typed edge data. */
export type GraphEdge<Data = any, Optional extends boolean = false> = Specialize<
  BaseGraphEdge,
  Optional extends true ? { data?: Data } : { data: Data }
>;

/**
 * Generic graph.
 */
export const Graph = S.Struct({
  nodes: S.mutable(S.Array(BaseGraphNode)),
  edges: S.mutable(S.Array(BaseGraphEdge)),
});

export type Graph = S.Schema.Type<typeof Graph>;

export const emptyGraph: Graph = { nodes: [], edges: [] };
