//
// Copyright 2024 DXOS.org
//

import { inspectCustom } from '@dxos/debug';
import { failedInvariant, invariant } from '@dxos/invariant';
import { getSnapshot } from '@dxos/live-object';
import { type MakeOptional, isNotFalsy, removeBy } from '@dxos/util';

import { type Graph, type GraphNode, type GraphEdge, type BaseGraphNode, type BaseGraphEdge } from './types';
import { createEdgeId } from './util';

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
    this._graph = graph ?? { nodes: [], edges: [] };
  }

  [inspectCustom]() {
    return this.toJSON();
  }

  /**
   * Return stable sorted JSON representation of graph.
   */
  // TODO(burdon): Create separate toJson method with computed signal.
  toJSON() {
    const { id, nodes, edges } = getSnapshot(this._graph);
    nodes.sort(({ id: a }, { id: b }) => a.localeCompare(b));
    edges.sort(({ id: a }, { id: b }) => a.localeCompare(b));
    return { id, nodes, edges };
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

  private _traverse(root: Node, visited: Set<string> = new Set()): Node[] {
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
export abstract class AbstractGraphModel<
  Node extends BaseGraphNode,
  Edge extends BaseGraphEdge,
  Model extends AbstractGraphModel<Node, Edge, Model, Builder>,
  Builder extends AbstractGraphBuilder<Node, Edge, Model>,
> extends ReadonlyGraphModel<Node, Edge> {
  /**
   * Allows chaining.
   */
  abstract get builder(): Builder;

  /**
   * Shallow copy of provided graph.
   */
  abstract copy(graph?: Partial<Graph>): Model;

  clear(): this {
    this._graph.nodes.length = 0;
    this._graph.edges.length = 0;
    return this;
  }

  addGraph(graph: Model): this {
    this.addNodes(graph.nodes);
    this.addEdges(graph.edges);
    return this;
  }

  addGraphs(graphs: Model[]): this {
    graphs.forEach((graph) => {
      this.addNodes(graph.nodes);
      this.addEdges(graph.edges);
    });
    return this;
  }

  addNode(node: Node): Node {
    invariant(node.id);
    invariant(!this.findNode(node.id));
    this._graph.nodes.push(node);
    return node;
  }

  addNodes(nodes: Node[]): Node[] {
    return nodes.map((node) => this.addNode(node));
  }

  addEdge(edge: MakeOptional<Edge, 'id'>): Edge {
    invariant(edge.source);
    invariant(edge.target);
    if (!edge.id) {
      // TODO(burdon): Generate random id.
      edge = { ...edge, id: createEdgeId(edge) };
    }
    invariant(!this.findNode(edge.id!));
    this._graph.edges.push(edge as Edge);
    return edge as Edge;
  }

  addEdges(edges: Edge[]): Edge[] {
    return edges.map((edge) => this.addEdge(edge));
  }

  removeNode(id: string): Model {
    const nodes = removeBy<Node>(this._graph.nodes as Node[], (node) => node.id === id);
    const edges = removeBy<Edge>(this._graph.edges as Edge[], (edge) => edge.source === id || edge.target === id);
    return this.copy({ nodes, edges });
  }

  removeNodes(ids: string[]): Model {
    const graphs = ids.map((id) => this.removeNode(id));
    return this.copy().addGraphs(graphs);
  }

  removeEdge(id: string): Model {
    const edges = removeBy<Edge>(this._graph.edges as Edge[], (edge) => edge.id === id);
    return this.copy({ nodes: [], edges });
  }

  removeEdges(ids: string[]): Model {
    const graphs = ids.map((id) => this.removeEdge(id));
    return this.copy().addGraphs(graphs);
  }
}

/**
 * Chainable wrapper
 */
export abstract class AbstractGraphBuilder<
  Node extends BaseGraphNode,
  Edge extends BaseGraphEdge,
  Model extends GraphModel<Node, Edge>,
> {
  constructor(protected readonly _model: Model) {}

  get model(): Model {
    return this._model;
  }

  call(cb: (builder: this) => void): this {
    cb(this);
    return this;
  }

  getNode(id: string): Node {
    return this.model.getNode(id);
  }

  addNode(node: Node): this {
    this._model.addNode(node);
    return this;
  }

  addEdge(edge: MakeOptional<Edge, 'id'>): this {
    this._model.addEdge(edge);
    return this;
  }

  addNodes(nodes: Node[]): this {
    this._model.addNodes(nodes);
    return this;
  }

  addEdges(edges: Edge[]): this {
    this._model.addEdges(edges);
    return this;
  }
}

export class GraphModel<
  Node extends BaseGraphNode = BaseGraphNode,
  Edge extends BaseGraphEdge = BaseGraphEdge,
> extends AbstractGraphModel<Node, Edge, GraphModel<Node, Edge>, GraphBuilder<Node, Edge>> {
  override get builder() {
    return new GraphBuilder<Node, Edge>(this);
  }

  override copy(graph?: Partial<Graph>) {
    return new GraphModel<Node, Edge>({ nodes: graph?.nodes ?? [], edges: graph?.edges ?? [] });
  }
}

export class GraphBuilder<
  Node extends BaseGraphNode = BaseGraphNode,
  Edge extends BaseGraphEdge = BaseGraphEdge,
> extends AbstractGraphBuilder<Node, Edge, GraphModel<Node, Edge>> {
  override call(cb: (builder: this) => void) {
    cb(this);
    return this;
  }
}
