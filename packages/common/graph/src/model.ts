//
// Copyright 2024 DXOS.org
//

import { effect } from '@preact/signals-core';

import { inspectCustom } from '@dxos/debug';
import { failedInvariant, invariant } from '@dxos/invariant';
import { type Live, live } from '@dxos/live-object';
import { type MakeOptional, isNotFalsy, removeBy } from '@dxos/util';

import { type BaseGraphEdge, type BaseGraphNode, type Graph, type GraphEdge, type GraphNode } from './types';
import { createEdgeId } from './util';

/**
 * Readonly Graph wrapper.
 */
export class ReadonlyGraphModel<
  Node extends BaseGraphNode = BaseGraphNode,
  Edge extends BaseGraphEdge = BaseGraphEdge,
> {
  protected readonly _graph: Graph;

  /**
   * NOTE: Pass in simple Graph or Live.
   */
  constructor(graph?: Graph) {
    this._graph = graph ?? {
      nodes: [],
      edges: [],
    };
  }

  [inspectCustom]() {
    return this.toJSON();
  }

  /**
   * Return stable sorted JSON representation of graph.
   */
  toJSON() {
    return {
      nodes: this.nodes.length,
      edges: this.edges.length,
    };
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

  filterNodes({ type }: Partial<GraphNode.Any> = {}): Node[] {
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
 * Mutable Graph wrapper.
 */
export abstract class AbstractGraphModel<
  Node extends BaseGraphNode = BaseGraphNode,
  Edge extends BaseGraphEdge = BaseGraphEdge,
  Model extends AbstractGraphModel<Node, Edge, Model, Builder> = any,
  Builder extends AbstractGraphBuilder<Node, Edge, Model> = AbstractGraphBuilder<Node, Edge, Model>,
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
    invariant(node.id, 'ID is required');
    invariant(!this.findNode(node.id), `node already exists: ${node.id}`);
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
      edge = { id: createEdgeId(edge), ...edge };
    }
    invariant(!this.findNode(edge.id!));
    this._graph.edges.push(edge as Edge);
    return edge as Edge;
  }

  addEdges(edges: Edge[]): Edge[] {
    return edges.map((edge) => this.addEdge(edge));
  }

  removeNode(id: string): Model {
    const edges = removeBy<Edge>(this._graph.edges as Edge[], (edge) => edge.source === id || edge.target === id);
    const nodes = removeBy<Node>(this._graph.nodes as Node[], (node) => node.id === id);
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
 * Chainable builder wrapper
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

/**
 * Basic model.
 */
export class GraphModel<
  Node extends BaseGraphNode = BaseGraphNode,
  Edge extends BaseGraphEdge = BaseGraphEdge,
> extends AbstractGraphModel<Node, Edge, GraphModel<Node, Edge>, GraphBuilder<Node, Edge>> {
  override get builder() {
    return new GraphBuilder<Node, Edge>(this);
  }

  override copy(graph?: Partial<Graph>): GraphModel<Node, Edge> {
    return new GraphModel<Node, Edge>({ nodes: graph?.nodes ?? [], edges: graph?.edges ?? [] });
  }
}

export type GraphModelSubscription = (model: GraphModel, graph: Live<Graph>) => void;

/**
 * Subscription.
 * NOTE: Requires `registerSignalsRuntime` to be called.
 */
export const subscribe = (model: GraphModel, cb: GraphModelSubscription, fire = false) => {
  if (fire) {
    cb(model, model.graph);
  }

  return effect(() => {
    cb(model, model.graph); // TODO(burdon): This won't work unless model.graph is reactive.
  });
};

/**
 * Basic reactive model.
 */
export class ReactiveGraphModel<
  Node extends BaseGraphNode = BaseGraphNode,
  Edge extends BaseGraphEdge = BaseGraphEdge,
> extends GraphModel<Node, Edge> {
  constructor(graph?: Partial<Graph>) {
    super(
      live({
        nodes: graph?.nodes ?? [],
        edges: graph?.edges ?? [],
      }),
    );
  }

  override copy(graph?: Partial<Graph>): ReactiveGraphModel<Node, Edge> {
    return new ReactiveGraphModel<Node, Edge>(graph);
  }

  subscribe(cb: GraphModelSubscription, fire = false): () => void {
    return subscribe(this, cb, fire);
  }
}

/**
 * Basic builder.
 */
export class GraphBuilder<
  Node extends BaseGraphNode = BaseGraphNode,
  Edge extends BaseGraphEdge = BaseGraphEdge,
> extends AbstractGraphBuilder<Node, Edge, GraphModel<Node, Edge>> {
  override call(cb: (builder: this) => void): this {
    cb(this);
    return this;
  }
}
