//
// Copyright 2024 DXOS.org
//

import { inspectCustom } from '@dxos/debug';
import { failedInvariant, invariant } from '@dxos/invariant';
import { getSnapshot } from '@dxos/live-object';
import { type MakeOptional, isNotFalsy, removeBy } from '@dxos/util';

import { createEdgeId } from './buidler';
import { type Graph, type GraphNode, type GraphEdge, type BaseGraphNode, type BaseGraphEdge } from './types';

/**
 * Wrapper class contains reactive nodes and edges.
 */
export class ReadonlyGraphModel<
  Node extends BaseGraphNode = BaseGraphNode,
  Edge extends BaseGraphEdge = BaseGraphEdge,
> {
  protected readonly _graph: Graph;

  /**
   * NOTE: Pass in simple Graph or ReactiveObject.
   */
  constructor(graph?: Graph) {
    this._graph = graph ?? { nodes: [], edges: [] }; // TODO(burdon): Create.
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

  //
  // Nodes
  //

  findNode(id: string): Node | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  getNode(id: string): Node {
    return this.findNode(id) ?? failedInvariant();
  }

  filterNodes({ type }: Partial<GraphNode> = {}): Node[] {
    return this.nodes.filter((node) => !type || type === node.type);
  }

  //
  // Edges
  //

  findEdge(id: string): Edge | undefined {
    return this.edges.find((edge) => edge.id === id);
  }

  getEdge(id: string): Edge {
    return this.findEdge(id) ?? failedInvariant();
  }

  filterEdges({ type, source, target }: Partial<GraphEdge> = {}): Edge[] {
    return this.edges.filter(
      (edge) =>
        (!type || type === edge.type) && (!source || source === edge.source) && (!target || target === edge.target),
    );
  }

  //
  // Traverse
  //

  traverse(root: Node): Node[] {
    return this._traverse(root);
  }

  _traverse(root: Node, visited: Set<string> = new Set()): Node[] {
    if (visited.has(root.id)) {
      return [];
    }

    visited.add(root.id);
    const targets = this.filterEdges({ source: root.id })
      .map((edge) => this.getNode(edge.target))
      .filter(isNotFalsy);

    return [root, ...targets.flatMap((target) => this._traverse(target, visited))];
  }
}

/**
 * Typed wrapper.
 */
export class GraphModel<
  Node extends BaseGraphNode = BaseGraphNode,
  Edge extends BaseGraphEdge = BaseGraphEdge,
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
    invariant(node.id);
    invariant(!this.findNode(node.id));
    this._graph.nodes.push(node);
    return this;
  }

  addNodes(nodes: Node[]): this {
    nodes.forEach((node) => this.addNode(node));
    return this;
  }

  addEdge(edge: MakeOptional<Edge, 'id'>): this {
    invariant(edge.source);
    invariant(edge.target);
    if (!edge.id) {
      edge = { ...edge, id: createEdgeId(edge) };
    }
    invariant(!this.findNode(edge.id!));
    this._graph.edges.push(edge as Edge);
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
    return new GraphModel<Node, Edge>({ nodes: [], edges: [] }).addGraphs(graphs);
  }

  removeEdge(id: string): GraphModel<Node, Edge> {
    const edges = removeBy(this._graph.edges, (edge) => edge.id === id);
    return new GraphModel<Node, Edge>({ nodes: [], edges });
  }

  removeEdges(ids: string[]): GraphModel<Node, Edge> {
    const graphs = ids.map((id) => this.removeEdge(id));
    return new GraphModel<Node, Edge>({ nodes: [], edges: [] }).addGraphs(graphs);
  }
}
