//
// Copyright 2025 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import { AbstractGraphModel, AbstractGraphBuilder, Graph, type GraphEdge, type GraphNode } from '@dxos/graph';
import { create } from '@dxos/live-object';

import { type Connection, type Shape } from '../types';

export class CanvasGraphModel<S extends Shape = Shape> extends AbstractGraphModel<
  GraphNode<S>,
  GraphEdge<Connection>,
  CanvasGraphModel<S>,
  CanvasGraphBuilder<S>
> {
  static create<S extends Shape>(graph?: Partial<Graph>): CanvasGraphModel<S> {
    return new CanvasGraphModel(
      create(Graph, {
        nodes: graph?.nodes ?? [],
        edges: graph?.edges ?? [],
      }),
    );
  }

  override get builder() {
    return new CanvasGraphBuilder(this);
  }

  override copy(graph?: Partial<Graph>) {
    return CanvasGraphModel.create<S>(graph);
  }

  createNode({ id, data }: { id?: string; data: S }): GraphNode<S> {
    const node: GraphNode<S> = { id: id ?? ObjectId.random(), data };
    this.addNode(node);
    return node;
  }
}

export class CanvasGraphBuilder<S extends Shape = Shape> extends AbstractGraphBuilder<
  GraphNode<S>,
  GraphEdge<Connection>,
  CanvasGraphModel<S>
> {}
