//
// Copyright 2025 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import { AbstractGraphBuilder, AbstractGraphModel, type Graph, createEdgeId } from '@dxos/graph';
import { DXN } from '@dxos/keys';
import { create, makeRef } from '@dxos/live-object';

import { ComputeGraph, type ComputeEdge, type ComputeNode, isComputeGraph } from './graph';
import { DEFAULT_INPUT } from './types';

// TODO(burdon): DXN from echo-schema is a different type.

export class ComputeGraphModel extends AbstractGraphModel<
  ComputeNode,
  ComputeEdge,
  ComputeGraphModel,
  ComputeGraphBuilder
> {
  static create(graph?: Partial<Graph>): ComputeGraphModel {
    return new ComputeGraphModel(
      create(ComputeGraph, {
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

  override copy(graph?: Partial<Graph>) {
    return ComputeGraphModel.create(graph);
  }

  //
  // Custom methods.
  //

  createNode({ id, ...rest }: Partial<ComputeNode>): ComputeNode {
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
          subgraph: makeRef(target.node),
        }).id
      : typeof target.node === 'string'
        ? target.node
        : target.node.id;

    const edge: ComputeEdge = {
      id: createEdgeId({ source: sourceId, target: targetId }),
      source: sourceId,
      target: targetId,
      output: source.property ?? DEFAULT_INPUT,
      input: target.property ?? DEFAULT_INPUT,
    };

    this.addEdge(edge);
    return edge;
  }
}

class ComputeGraphBuilder extends AbstractGraphBuilder<ComputeNode, ComputeEdge, ComputeGraphModel> {
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
