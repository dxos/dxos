//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';

// Prior art:
//  - https://graphology.github.io (TS, tree-shakable, multiple packages for extensions)
//  - https://github.com/dagrejs/graphlib (mature, extensive)
//  - https://github.com/avoidwork/tiny-graph

export const BaseNode = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  data: S.optional(S.Any),
});

export type BaseNode = S.Schema.Type<typeof BaseNode>;
export type Node<T extends object | void = void> = BaseNode & { data: T };

export const BaseEdge = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  source: S.String,
  target: S.String,
  data: S.optional(S.Any),
});

export type BaseEdge = S.Schema.Type<typeof BaseEdge>;
export type Edge<T extends object | void = void> = BaseEdge & { data: T };

/**
 * Generic graph abstraction.
 */
export const Graph = S.Struct({
  nodes: S.mutable(S.Array(BaseNode)),
  edges: S.mutable(S.Array(BaseEdge)),
});

export type Graph = S.Schema.Type<typeof Graph>;

export const emptyGraph: Graph = { nodes: [], edges: [] };
