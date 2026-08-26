//
// Copyright 2025 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import * as GraphEdge from '@dxos/graph/GraphEdge';
import * as GraphModel from '@dxos/graph/GraphModel';
import { EntityId } from '@dxos/keys';
import { type MakeOptional } from '@dxos/util';

import { type ComputeEdge, ComputeGraph, type ComputeNode, isComputeGraph } from './graph';
import { DEFAULT_INPUT, DEFAULT_OUTPUT } from './schema';

export class ComputeGraphModel extends GraphModel.AbstractGraphModel<ComputeNode, ComputeEdge, ComputeGraphModel> {
  static create(graph?: Partial<GraphModel.Data<ComputeNode, ComputeEdge>>): ComputeGraphModel {
    return new ComputeGraphModel(
      Obj.make(ComputeGraph, {
        graph: {
          id: graph?.id ?? EntityId.random(),
          nodes: graph?.nodes ?? [],
          edges: graph?.edges ?? [],
        },
      }),
    );
  }

  private readonly _root: ComputeGraph;

  constructor(root: ComputeGraph) {
    super({ graph: root.graph as GraphModel.Data<ComputeNode, ComputeEdge>, change: (fn) => Obj.update(root, fn) });
    this._root = root;
  }

  get root() {
    return this._root;
  }

  override copy(graph?: Partial<GraphModel.Data<ComputeNode, ComputeEdge>>): ComputeGraphModel {
    return ComputeGraphModel.create(graph);
  }

  //
  // Custom methods.
  //

  createNode({ id, ...rest }: MakeOptional<ComputeNode, 'id'>): ComputeNode {
    const node: ComputeNode = { id: id ?? EntityId.random(), ...rest };
    this.addNode(node);
    return node;
  }

  createEdge(
    source: { node: string | ComputeNode; property?: string },
    target: { node: string | ComputeNode | ComputeGraph; property?: string },
  ): ComputeEdge {
    const sourceId = typeof source.node === 'string' ? source.node : source.node.id;

    // Create local intermediate node for the subgraph.
    const targetId = isComputeGraph(target.node)
      ? this.createNode({
          type: target.node.graph.id!,
          subgraph: Ref.make(target.node),
        }).id
      : typeof target.node === 'string'
        ? target.node
        : target.node.id;

    const output = source.property ?? DEFAULT_OUTPUT;
    const input = target.property ?? DEFAULT_INPUT;
    const edge: ComputeEdge = {
      // Ports disambiguate the parallel edges a pair of nodes may carry.
      id: GraphEdge.createId({ source: sourceId, target: targetId, relation: `${output}-${input}` }),
      source: sourceId,
      target: targetId,
      output,
      input,
    };

    this.addEdge(edge);
    return edge;
  }
}
