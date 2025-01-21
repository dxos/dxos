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

  toJSON() {
    // Sort to enable stable comparisons.
    this._graph.nodes.sort(({ id: a }, { id: b }) => a.localeCompare(b));
    this._graph.edges.sort(({ id: a }, { id: b }) => a.localeCompare(b));
    return JSON.parse(JSON.stringify(this._graph));
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

  getNodes({ type }: Partial<Node>): Node[] {
    return this.nodes.filter((node) => !type || type === node.type);
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.find((edge) => edge.id === id);
  }

  getEdges({ type, source, target }: Partial<Edge>): Edge[] {
    return this.edges.filter(
      (edge) =>
        (!type || type === edge.type) && (!source || source === edge.source) && (!target || target === edge.target),
    );
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

  addGraphs(graphs: GraphModel<Node, Edge>[]): this {
    graphs.forEach((graph) => {
      this.addNodes(graph.nodes);
      this.addEdges(graph.edges);
    });
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

  // TODO(burdon): Return graph.

  removeNode(id: string): GraphModel<Node, Edge> {
    const nodes = removeElements(this._graph.nodes, (node) => node.id === id);
    const edges = removeElements(this._graph.edges, (edge) => edge.source === id || edge.target === id);
    return new GraphModel<Node, Edge>({ nodes, edges });
  }

  removeNodes(ids: string[]): GraphModel<Node, Edge> {
    const graphs = ids.map((id) => this.removeNode(id));
    return new GraphModel<Node, Edge>().addGraphs(graphs);
  }

  removeEdge(id: string): GraphModel<Node, Edge> {
    const edges = removeElements(this._graph.edges, (edge) => edge.id === id);
    return new GraphModel<Node, Edge>({ edges });
  }

  removeEdges(ids: string[]): GraphModel<Node, Edge> {
    const graphs = ids.map((id) => this.removeEdge(id));
    return new GraphModel<Node, Edge>().addGraphs(graphs);
  }
}
