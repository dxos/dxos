//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Specialize } from '@dxos/util';

//
// Node
//

// TODO(burdon): Make type extensible (i.e., not dependent on `data` property)?
export const BaseGraphNode = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Any),
});

/** Raw base type. */
export type BaseGraphNode = Schema.Schema.Type<typeof BaseGraphNode>;

/** Typed node data. */
type GraphNode<Data = any, Optional extends boolean = false> = Specialize<
  BaseGraphNode,
  Optional extends true ? { data?: Data } : { data: Data }
>;

export declare namespace GraphNode {
  export type Any = GraphNode<any, true>;
  export type Optional<Data = any> = GraphNode<Data, true>;
  export type Required<Data = any> = GraphNode<Data, false>;
}

//
// Edge
//

export const BaseGraphEdge = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  source: Schema.String,
  target: Schema.String,
  data: Schema.optional(Schema.Any),
});

/** Raw base type. */
export type BaseGraphEdge = Schema.Schema.Type<typeof BaseGraphEdge>;

/** Typed edge data. */
export type GraphEdge<Data = any, Optional extends boolean = false> = Specialize<
  BaseGraphEdge,
  Optional extends true ? { data?: Data } : { data: Data }
>;

export declare namespace GraphEdge {
  export type Any = GraphEdge<any, true>;
  export type Optional<Data = any> = GraphEdge<Data, true>;
  export type Required<Data = any> = GraphEdge<Data, false>;
}

//
// Graph
//

export const Graph = Schema.Struct({
  id: Schema.optional(Schema.String), // TODO(burdon): ObjectId.
  nodes: Schema.mutable(Schema.Array(BaseGraphNode)),
  edges: Schema.mutable(Schema.Array(BaseGraphEdge)),
});

export type Graph = Schema.Schema.Type<typeof Graph>;
