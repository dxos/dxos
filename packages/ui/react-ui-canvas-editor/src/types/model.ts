//
// Copyright 2025 DXOS.org
//

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { Obj } from '@dxos/echo';
import { isProxy } from '@dxos/echo/internal';
import * as GraphModel from '@dxos/graph/GraphModel';
import { type MakeOptional } from '@dxos/util';

import { type Connection, type Shape } from './schema';

export class CanvasGraphModel<S extends Shape = Shape> extends GraphModel.AbstractGraphModel<
  S,
  Connection,
  CanvasGraphModel<S>
> {
  static create<S extends Shape>(
    graph?: Partial<GraphModel.AnyData>,
    change?: GraphModel.GraphChangeFunction,
  ): CanvasGraphModel<S> {
    if (isProxy(graph) as any) {
      return new CanvasGraphModel<S>({ graph: graph as GraphModel.Data<S, Connection>, change });
    }

    return new CanvasGraphModel<S>({
      graph: {
        nodes: (graph?.nodes ?? []) as S[],
        edges: (graph?.edges ?? []) as Connection[],
      },
    });
  }

  override copy(graph?: Partial<GraphModel.Data<S, Connection>>): CanvasGraphModel<S> {
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
