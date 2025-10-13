//
// Copyright 2025 DXOS.org
//

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { ObjectId } from '@dxos/echo/internal';
import { AbstractGraphBuilder, AbstractGraphModel, Graph } from '@dxos/graph';
import { isLiveObject } from '@dxos/live-object';
import { live } from '@dxos/echo/internal';
import { type MakeOptional } from '@dxos/util';

import { type Connection, type Shape } from './schema';

export class CanvasGraphModel<S extends Shape = Shape> extends AbstractGraphModel<
  S,
  Connection,
  CanvasGraphModel<S>,
  CanvasGraphBuilder<S>
> {
  static create<S extends Shape>(graph?: Partial<Graph>): CanvasGraphModel<S> {
    if (isLiveObject(graph) as any) {
      return new CanvasGraphModel<S>(graph as Graph);
    }

    return new CanvasGraphModel<S>(
      live(Graph, {
        nodes: graph?.nodes ?? [],
        edges: graph?.edges ?? [],
      }),
    );
  }

  override get builder() {
    return new CanvasGraphBuilder(this);
  }

  override copy(graph?: Partial<Graph>): CanvasGraphModel<S> {
    return CanvasGraphModel.create<S>(graph);
  }

  createNode({ id, ...rest }: MakeOptional<S, 'id'>): S {
    const node: S = { id: id ?? ObjectId.random(), ...rest } as S;
    this.addNode(node);
    return node;
  }

  createEdge({
    id,
    source,
    target,
    output = DEFAULT_OUTPUT,
    input = DEFAULT_INPUT,
    ...rest
  }: MakeOptional<Connection, 'id'>): Connection {
    const edge: Connection = {
      id: id ?? ObjectId.random(),
      source,
      target,
      output,
      input,
      ...rest,
    } as Connection;
    this.addEdge(edge);
    return edge;
  }
}

export class CanvasGraphBuilder<S extends Shape = Shape> extends AbstractGraphBuilder<
  S,
  Connection,
  CanvasGraphModel<S>
> {
  createNode(props: MakeOptional<S, 'id'>): this {
    this.model.createNode(props);
    return this;
  }

  createEdge(props: MakeOptional<Connection, 'id'>): this {
    this.model.createEdge(props);
    return this;
  }
}
