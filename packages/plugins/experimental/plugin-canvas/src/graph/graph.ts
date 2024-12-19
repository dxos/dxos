//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { create } from '@dxos/live-object';

import { removeElements } from './util';

export const BaseNode = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  data: S.optional(S.Any),
});

export type BaseNode = S.Schema.Type<typeof BaseNode>;

export const BaseEdge = S.Struct({
  id: S.String,
  type: S.optional(S.String),
  source: S.String,
  target: S.String,
  data: S.optional(S.Any),
});

export type BaseEdge = S.Schema.Type<typeof BaseEdge>;

/**
 * Generic graph abstraction.
 */
export const Graph = S.Struct({
  nodes: S.mutable(S.Array(BaseNode)),
  edges: S.mutable(S.Array(BaseEdge)),
});

export type Graph = S.Schema.Type<typeof Graph>;

export const emptyGraph: Graph = { nodes: [], edges: [] };

export type Node<T extends object | void = void> = BaseNode & { data: T };
export type Edge<T extends object | void = void> = BaseEdge & { data: T };

/**
 * Typed object graph.
 */
// TODO(burdon): Factor out.
// TODO(burdon): Make reactive using signals.
export class GraphModel<GraphNode extends Node = any, GraphEdge extends Edge = any> {
  private readonly _graph: Graph;

  constructor(obj: Partial<Graph> = {}) {
    this._graph = create(Graph, { nodes: [], edges: [], ...obj });
  }

  get graph(): Graph {
    return this._graph;
  }

  get nodes(): GraphNode[] {
    return this._graph.nodes as GraphNode[];
  }

  get edges(): GraphEdge[] {
    return this._graph.edges as GraphEdge[];
  }

  getNode(id: string): GraphNode | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  getEdge(id: string): GraphEdge | undefined {
    return this.edges.find((edge) => edge.id === id);
  }

  addNode(node: GraphNode): this {
    this._graph.nodes.push(node);
    return this;
  }

  addEdge(edge: GraphEdge): this {
    this._graph.edges.push(edge);
    return this;
  }

  removeNode(id: string): this {
    removeElements(this._graph.nodes, (node) => node.id === id);
    removeElements(this._graph.edges, (edge) => edge.source === id || edge.target === id);
    return this;
  }

  removeEdge(id: string): this {
    removeElements(this._graph.edges, (edge) => edge.id === id);
    return this;
  }
}
