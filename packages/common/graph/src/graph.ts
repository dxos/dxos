//
// Copyright 2024 DXOS.org
//

import { inspectCustom } from '@dxos/debug';
import { getSnapshot } from '@dxos/live-object';
import { removeBy } from '@dxos/util';

import { type Graph, type GraphNode, type GraphEdge } from './types';

/**
 * Typed reactive object graph.
 */
export class ReadonlyGraphModel<Node extends GraphNode<any> = any, Edge extends GraphEdge<any> = any> {
  protected readonly _graph: Graph;

  /**
   * NOTE: Pass in simple Graph or ReactiveObject.
   */
  constructor(graph?: Graph) {
    this._graph = graph ?? { nodes: [], edges: [] };
  }

  [inspectCustom]() {
    return this.toJSON();
  }

  /**
   * Return stable sorted JSON representation of graph.
   */
  toJSON() {
    const { nodes, edges } = getSnapshot(this._graph);
    nodes.sort(({ id: a }, { id: b }) => a.localeCompare(b));
    edges.sort(({ id: a }, { id: b }) => a.localeCompare(b));
    return { nodes, edges };
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

  getNodes({ type }: Partial<Node> = {}): Node[] {
    return this.nodes.filter((node) => !type || type === node.type);
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.find((edge) => edge.id === id);
  }

  getEdges({ type, source, target }: Partial<Edge> = {}): Edge[] {
    return this.edges.filter(
      (edge) =>
        (!type || type === edge.type) && (!source || source === edge.source) && (!target || target === edge.target),
    );
  }
}

/**
 * Typed wrapper.
 */
export class GraphModel<
  Node extends GraphNode<any> = any,
  Edge extends GraphEdge<any> = any,
> extends ReadonlyGraphModel<Node, Edge> {
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

  removeNode(id: string): GraphModel<Node, Edge> {
    const nodes = removeBy(this._graph.nodes, (node) => node.id === id);
    const edges = removeBy(this._graph.edges, (edge) => edge.source === id || edge.target === id);
    return new GraphModel<Node, Edge>({ nodes, edges });
  }

  removeNodes(ids: string[]): GraphModel<Node, Edge> {
    const graphs = ids.map((id) => this.removeNode(id));
    return new GraphModel<Node, Edge>().addGraphs(graphs);
  }

  removeEdge(id: string): GraphModel<Node, Edge> {
    const edges = removeBy(this._graph.edges, (edge) => edge.id === id);
    return new GraphModel<Node, Edge>({ nodes: [], edges });
  }

  removeEdges(ids: string[]): GraphModel<Node, Edge> {
    const graphs = ids.map((id) => this.removeEdge(id));
    return new GraphModel<Node, Edge>().addGraphs(graphs);
  }
}
