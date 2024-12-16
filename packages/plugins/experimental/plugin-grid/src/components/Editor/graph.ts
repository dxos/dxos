//
// Copyright 2024 DXOS.org
//

export type Node<T extends object = any> = {
  id: string;
  data: T;
};

export type Edge<T extends object = any> = {
  id: string;
  source: string;
  target: string;
  data: T;
};

export type Graph<N extends Node = Node<any>, E extends Edge = Edge<any>> = {
  root?: string;
  nodes?: N[];
  edges?: E[];
};

export class GraphWrapper<N extends Node = Node<any>, E extends Edge = Edge<any>> {
  constructor(private readonly _graph: Graph<N, E> = {}) {}

  get graph(): Graph<N, E> {
    return this._graph;
  }

  get nodes(): readonly N[] {
    return this._graph.nodes || [];
  }

  get edges(): readonly E[] {
    return this._graph.edges || [];
  }

  addNode(node: N): this {
    this._graph.nodes = this._graph.nodes || [];
    this._graph.nodes.push(node);
    return this;
  }

  addEdge(edge: E): this {
    this._graph.edges = this._graph.edges || [];
    this._graph.edges.push(edge);
    return this;
  }

  getNode(id: string): N | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  getEdge(id: string): E | undefined {
    return this.edges.find((edge) => edge.id === id);
  }
}
