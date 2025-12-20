//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type Specialize } from '@dxos/util';

//
// Node
//

export const Node = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Any),
});

/** Raw base type. */
export interface Node extends Schema.Schema.Type<typeof Node> {}

/** Typed node data. */
type Node$<Data = any, Optional extends boolean = false> = Specialize<
  Node,
  Optional extends true ? { data?: Data } : { data: Data }
>;

export declare namespace Node {
  export type Any = Node$<any, true>;
  export type Optional<Data = any> = Node$<Data, true>;
  export type Required<Data = any> = Node$<Data, false>;
}

//
// Edge
//

export const Edge = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  source: Schema.String,
  target: Schema.String,
  data: Schema.optional(Schema.Any),
});

/** Raw base type. */
export type Edge = Schema.Schema.Type<typeof Edge>;

/** Typed edge data. */
type Edge$<Data = any, Optional extends boolean = false> = Specialize<
  Edge,
  Optional extends true ? { data?: Data } : { data: Data }
>;

export declare namespace Edge {
  export type Any = Edge$<any, true>;
  export type Optional<Data = any> = Edge$<Data, true>;
  export type Required<Data = any> = Edge$<Data, false>;
}

//
// Graph
//

export const Graph = Schema.Struct({
  id: Schema.optional(Schema.String),
  nodes: Schema.mutable(Schema.Array(Node)),
  edges: Schema.mutable(Schema.Array(Edge)),
});

export interface Graph extends Schema.Schema.Type<typeof Graph> {}
