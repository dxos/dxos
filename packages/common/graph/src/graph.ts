//
// Copyright 2024 DXOS.org
//

import { create } from '@dxos/live-object';

import { Graph, type GraphNode, type GraphEdge } from './types';
import { removeElements } from './util';

// TODO(burdon): Traversal/visitor.

/**
 * Typed reactive object graph.
 */
export class ReadonlyGraphModel<Node extends GraphNode = any, Edge extends GraphEdge = any> {
  protected readonly _graph: Graph;

  constructor({ nodes = [], edges = [] }: Partial<Graph> = {}) {
    this._graph = create(Graph, { nodes, edges });
  }

  get graph(): Graph {
    return this._graph;
  }

  get nodes(): Node[] {
    return this._graph.nodes as Node[];
  }

  get edges(): Edge[] {
    return this._graph.edges as Edge[];
  }

  getNode(id: string): Node | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.find((edge) => edge.id === id);
  }

  getEdges({ source, target }: Partial<Edge>): Edge[] {
    return this.edges.filter((e) => (!source || source === e.source) && (!target || target === e.target));
  }
}

export class GraphModel<Node extends GraphNode = any, Edge extends GraphEdge = any> extends ReadonlyGraphModel<
  Node,
  Edge
> {
  clear(): this {
    this._graph.nodes.length = 0;
    this._graph.edges.length = 0;
    return this;
  }

  addGraph(graph: GraphModel<Node, Edge>): this {
    this.addNodes(graph.nodes);
    this.addEdges(graph.edges);
    return this;
  }

  addNode(node: Node): this {
    this._graph.nodes.push(node);
    return this;
  }

  addNodes(nodes: Node[]): this {
    nodes.forEach((node) => this.addNode(node));
    return this;
  }

  addEdge(edge: Edge): this {
    this._graph.edges.push(edge);
    return this;
  }

  addEdges(edges: Edge[]): this {
    edges.forEach((edge) => this.addEdge(edge));
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
