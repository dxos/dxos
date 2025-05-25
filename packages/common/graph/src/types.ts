//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { type Specialize } from '@dxos/util';

// TODO(burdon): Generalize `id` via accessor.

//
// Node
//

export const BaseGraphNode = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),

  // TODO(burdon): Reconcile with ExtendableBaseGraphNode (one or the other).
  data: Schema.optional(Schema.Any),
});

// TODO(burdon): Why not just add to `data`?
export const ExtendableBaseGraphNode = Schema.extend(
  BaseGraphNode,
  Schema.Struct({}, { key: Schema.String, value: Schema.Any }),
);

/** Raw base type. */
export type BaseGraphNode = Schema.Schema.Type<typeof BaseGraphNode>;

/** Typed node data. */
export type GraphNode<Data = any, Optional extends boolean = false> = Specialize<
  BaseGraphNode,
  Optional extends true ? { data?: Data } : { data: Data }
>;

export declare namespace GraphNode {
  export type Optional<T = any> = GraphNode<T, true>;
}

//
// Edge
//

export const BaseGraphEdge = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Any),
  source: Schema.String,
  target: Schema.String,
});

/** Raw base type. */
export type BaseGraphEdge = Schema.Schema.Type<typeof BaseGraphEdge>;

/** Typed edge data. */
export type GraphEdge<Data = any, Optional extends boolean = false> = Specialize<
  BaseGraphEdge,
  Optional extends true ? { data?: Data } : { data: Data }
>;

export declare namespace GraphEdge {
  export type Optional<T = any> = GraphEdge<T, true>;
}

//
// Graph
//

export const Graph = Schema.Struct({
  id: Schema.optional(Schema.String),
  nodes: Schema.mutable(Schema.Array(ExtendableBaseGraphNode)),
  edges: Schema.mutable(Schema.Array(BaseGraphEdge)),
});

export type Graph = Schema.Schema.Type<typeof Graph>;
