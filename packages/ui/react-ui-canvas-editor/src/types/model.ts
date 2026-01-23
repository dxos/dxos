//
// Copyright 2025 DXOS.org
//

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { type Graph, GraphModel } from '@dxos/graph';
import { isLiveObject } from '@dxos/live-object';
import { type MakeOptional } from '@dxos/util';

import { type Connection, type Shape } from './schema';

export class CanvasGraphModel<S extends Shape = Shape> extends GraphModel.AbstractGraphModel<
  S,
  Connection,
  CanvasGraphModel<S>,
  CanvasGraphBuilder<S>
> {
  static create<S extends Shape>(graph?: Partial<Graph.Any>): CanvasGraphModel<S> {
    if (isLiveObject(graph) as any) {
      return new CanvasGraphModel<S>(graph as Graph.Graph<S, Connection>);
    }

    return new CanvasGraphModel<S>({
      nodes: (graph?.nodes ?? []) as S[],
      edges: (graph?.edges ?? []) as Connection[],
    });
  }

  override get builder() {
    return new CanvasGraphBuilder(this);
  }

  override copy(graph?: Partial<Graph.Graph<S, Connection>>): CanvasGraphModel<S> {
    return CanvasGraphModel.create<S>(graph);
  }

  createNode({ id, ...rest }: MakeOptional<S, 'id'>): S {
    const node: S = { id: id ?? Obj.ID.random(), ...rest } as S;
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
      id: id ?? Obj.ID.random(),
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

export class CanvasGraphBuilder<S extends Shape = Shape> extends GraphModel.AbstractBuilder<
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
