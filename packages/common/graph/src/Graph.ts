//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { invariant } from '@dxos/invariant';
import { type Specialize } from '@dxos/util';

//
// Node
//

export const Node = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.String),
  data: Schema.optional(Schema.Any),
});

interface BaseNode extends Schema.Schema.Type<typeof Node> {}

export declare namespace Node {
  export type Any = Specialize<BaseNode, { data?: any }>;
  export type Node<Data = any> = Specialize<BaseNode, { data: Data }>;
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

interface BaseEdge extends Schema.Schema.Type<typeof Edge> {}

export declare namespace Edge {
  export type Any = Specialize<BaseEdge, { data?: any }>;
  export type Edge<Data = any> = Specialize<BaseEdge, { data: Data }>;
}

const KEY_REGEX = /\w+/;

// NOTE: The `relation` is different from the `type`.
type EdgeMeta = { source: string; target: string; relation?: string };

export const createEdgeId = ({ source, target, relation }: EdgeMeta) => {
  invariant(source.match(KEY_REGEX), `invalid source: ${source}`);
  invariant(target.match(KEY_REGEX), `invalid target: ${target}`);
  return [source, relation, target].join('_');
};

export const parseEdgeId = (id: string): EdgeMeta => {
  const [source, relation, target] = id.split('_');
  invariant(source.length && target.length);
  return { source, relation: relation.length ? relation : undefined, target };
};

//
// Graph
//

export const Graph = Schema.Struct({
  id: Schema.optional(Schema.String),
  nodes: Schema.mutable(Schema.Array(Node)),
  edges: Schema.mutable(Schema.Array(Edge)),
});

export interface Graph extends Schema.Schema.Type<typeof Graph> {}
