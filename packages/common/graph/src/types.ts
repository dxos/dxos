//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

// Prior art:
// - https://graphology.github.io (TS, tree-shakable, multiple packages for extensions)
// - https://github.com/dagrejs/graphlib (mature, extensive)
// - https://github.com/avoidwork/tiny-graph
// - levelgraph, oxigraph (Rust WASM)

export const BaseGraphNode = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  data: S.optional(S.Any),
});

export type BaseGraphNode = S.Schema.Type<typeof BaseGraphNode>;
export type GraphNode<Data extends object | void = void> = BaseGraphNode & { data: Data };

export const BaseGraphEdge = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  source: S.String,
  target: S.String,
  data: S.optional(S.Any),
});

export type BaseGraphEdge = S.Schema.Type<typeof BaseGraphEdge>;
export type GraphEdge<Data extends object | void = void> = BaseGraphEdge & { data: Data };

/**
 * Generic graph abstraction.
 */
export const Graph = S.Struct({
  nodes: S.mutable(S.Array(BaseGraphNode)),
  edges: S.mutable(S.Array(BaseGraphEdge)),
});

export type Graph = S.Schema.Type<typeof Graph>;

export const emptyGraph: Graph = { nodes: [], edges: [] };
