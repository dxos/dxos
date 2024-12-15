//
// Copyright 2024 DXOS.org
//

import { S } from '@dxos/echo-schema';
import { create } from '@dxos/live-object';

import { removeElements } from './util';
import { createPathThroughPoints, type Dimension, getBounds, getRect, type Point, type Rect } from '../layout';

type ShapeCommon = {
  id: string;
  type: 'rect' | 'line';
  rect: Rect;
};

// TODO(burdon): Define schema for persistent objects.
export type Shape =
  | (ShapeCommon & {
      type: 'rect';
      text?: string;
      pos: Point;
      size: Dimension;
    })
  | (ShapeCommon & {
      type: 'line';
      path: string;
    });

export const createRect = ({
  id,
  pos,
  size,
  text,
}: {
  id: string;
  pos: Point;
  size: Dimension;
  text?: string;
}): Shape => ({
  id,
  type: 'rect',
  rect: getBounds(pos, size),
  pos,
  size,
  text,
});

export const createLine = ({ id, p1, p2 }: { id: string; p1: Point; p2: Point }): Shape => ({
  id,
  type: 'line',
  rect: getRect(p1, p2),
  path: createPathThroughPoints([p1, p2]),
});

export const Node = S.Struct({
  id: S.String,
  data: S.Any,
});

export type Node = S.Schema.Type<typeof Node>;

export const Edge = S.Struct({
  id: S.String,
  source: S.String,
  target: S.String,
  data: S.Any,
});

export type Edge = S.Schema.Type<typeof Edge>;

export const Graph = S.Struct({
  id: S.String,
  nodes: S.mutable(S.Array(Node)),
  edges: S.mutable(S.Array(Edge)),
});

export type Graph = S.Schema.Type<typeof Graph>;

export const emptyGraph: Graph = { id: 'test', nodes: [], edges: [] };

/**
 * Wrapper for graph operations.
 */
export class GraphModel {
  private readonly _graph: Graph;

  constructor(obj: Partial<Graph> = {}) {
    this._graph = create(Graph, { id: 'test', nodes: [], edges: [], ...obj });
  }

  get graph(): Graph {
    return this._graph;
  }

  get nodes(): readonly Node[] {
    return this._graph.nodes;
  }

  get edges(): readonly Edge[] {
    return this._graph.edges;
  }

  getNode(id: string): Node | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  getEdge(id: string): Edge | undefined {
    return this.edges.find((edge) => edge.id === id);
  }

  addNode(node: Node): this {
    this._graph.nodes.push(node);
    return this;
  }

  addEdge(edge: Edge): this {
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
