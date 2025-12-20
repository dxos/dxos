//
// Copyright 2025 DXOS.org
//

import { Obj, Ref } from '@dxos/echo';
import { Graph, GraphModel } from '@dxos/graph';
import { DXN, ObjectId } from '@dxos/keys';
import { type MakeOptional } from '@dxos/util';

import { type ComputeEdge, ComputeGraph, type ComputeNode, isComputeGraph } from './graph';
import { DEFAULT_INPUT, DEFAULT_OUTPUT } from './schema';

export class ComputeGraphModel extends GraphModel.AbstractGraphModel<
  ComputeNode,
  ComputeEdge,
  ComputeGraphModel,
  ComputeGraphBuilder
> {
  static create(graph?: Partial<Graph.Any>): ComputeGraphModel {
    return new ComputeGraphModel(
      Obj.make(ComputeGraph, {
        graph: {
          id: graph?.id ?? ObjectId.random(),
          nodes: graph?.nodes ?? [],
          edges: graph?.edges ?? [],
        },
      }),
    );
  }

  private readonly _root: ComputeGraph;

  constructor(root: ComputeGraph) {
    super(root.graph);
    this._root = root;
  }

  get root() {
    return this._root;
  }

  override get builder() {
    return new ComputeGraphBuilder(this);
  }

  override copy(graph?: Partial<Graph.Any>): ComputeGraphModel {
    return ComputeGraphModel.create(graph);
  }

  //
  // Custom methods.
  //

  createNode({ id, ...rest }: MakeOptional<ComputeNode, 'id'>): ComputeNode {
    const node: ComputeNode = { id: id ?? ObjectId.random(), ...rest };
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
          type: DXN.parse(target.node.graph.id!).toString(),
          subgraph: Ref.make(target.node),
        }).id
      : typeof target.node === 'string'
        ? target.node
        : target.node.id;

    const edge: ComputeEdge = {
      id: Graph.createEdgeId({ source: sourceId, target: targetId }),
      source: sourceId,
      target: targetId,
      output: source.property ?? DEFAULT_OUTPUT,
      input: target.property ?? DEFAULT_INPUT,
    };

    this.addEdge(edge);
    return edge;
  }
}

class ComputeGraphBuilder extends GraphModel.AbstractBuilder<ComputeNode, ComputeEdge, ComputeGraphModel> {
  createNode(props: Partial<ComputeNode>): this {
    this.model.createNode(props);
    return this;
  }

  createEdge(
    source: { node: string | ComputeNode; property?: string },
    target: { node: string | ComputeNode | ComputeGraph; property?: string },
  ): this {
    this.model.createEdge(source, target);
    return this;
  }
}
