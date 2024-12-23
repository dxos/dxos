//
// Copyright 2024 DXOS.org
//

import { create } from '@dxos/live-object';

import { type Edge, Graph, type Node } from './types';
import { removeElements } from './util';

// TODO(burdon): Traversal.

/**
 * Typed reactive object graph.
 */
export class ReadonlyGraphModel<GraphNode extends Node = any, GraphEdge extends Edge = any> {
  protected readonly _graph: Graph;

  constructor({ nodes = [], edges = [] }: Partial<Graph> = {}) {
    this._graph = create(Graph, { nodes, edges });
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

  getEdges({ source, target }: Partial<GraphEdge>): GraphEdge[] {
    return this.edges.filter((e) => (!source || source === e.source) && (!target || target === e.target));
  }
}

export class GraphModel<GraphNode extends Node = any, GraphEdge extends Edge = any> extends ReadonlyGraphModel<
  GraphNode,
  GraphEdge
> {
  clear(): this {
    this._graph.nodes.length = 0;
    this._graph.edges.length = 0;
    return this;
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
