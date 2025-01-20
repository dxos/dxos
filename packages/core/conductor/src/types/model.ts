//
// Copyright 2025 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import {
  AbstractGraphBuilder,
  AbstractGraphModel,
  type Graph,
  type GraphEdge,
  type GraphNode,
  createEdgeId,
} from '@dxos/graph';
import { create, makeRef } from '@dxos/live-object';

import { ComputeGraph, type ComputeEdge, type ComputeNode, isComputeGraph } from './graph';
import { DEFAULT_INPUT } from './types';

export class ComputeGraphModel extends AbstractGraphModel<
  GraphNode<ComputeNode>,
  GraphEdge<ComputeEdge>,
  ComputeGraphModel,
  ComputeGraphBuilder
> {
  /**
   * Create new model.
   */
  static create(graph?: Partial<Graph>): ComputeGraphModel {
    return new ComputeGraphModel(
      create(ComputeGraph, {
        graph: { nodes: graph?.nodes ?? [], edges: graph?.edges ?? [] },
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

  override get builder(): ComputeGraphBuilder {
    return new ComputeGraphBuilder(this);
  }

  override copy(graph?: Partial<Graph>) {
    return ComputeGraphModel.create(graph);
  }
}

class ComputeGraphBuilder extends AbstractGraphBuilder<
  GraphNode<ComputeNode>,
  GraphEdge<ComputeEdge>,
  ComputeGraphModel,
  ComputeGraphBuilder
> {
  override call(cb: (builder: ComputeGraphBuilder) => void): this {
    cb(this);
    return this;
  }

  getNode(id: string): GraphNode<ComputeNode> {
    return this._model.getNode(id);
  }

  createNode(id?: string, data: ComputeNode = {}): GraphNode<ComputeNode> {
    const node: GraphNode<ComputeNode> = { id: id ?? ObjectId.random(), data };
    this._model.addNode(node);
    return node;
  }

  linkNodes(
    source: { node: GraphNode<ComputeNode>; property?: string },
    target: { node: GraphNode<ComputeNode> | ComputeGraph; property?: string },
  ): GraphEdge<ComputeEdge> {
    if (isComputeGraph(target.node)) {
      // Create local intermediate node linked to the subgraph.
      target = { ...target, node: this.createNode(ObjectId.random(), { subgraph: makeRef(target.node) }) };
    }

    const edge: GraphEdge<ComputeEdge> = {
      id: createEdgeId({ source: source.node.id, target: target.node.id }),
      source: source.node.id,
      target: target.node.id,
      data: {
        output: source.property ?? DEFAULT_INPUT,
        input: target.property ?? DEFAULT_INPUT,
      },
    };

    this._model.addEdge(edge);
    return edge;
  }
}

// TODO(burdon): Move into builder.
export const createEdge = (params: {
  source: string;
  output: string;
  target: string;
  input: string;
}): GraphEdge<ComputeEdge> => ({
  id: createEdgeId({ source: params.source, target: params.target, relation: `${params.output}-${params.input}` }),
  source: params.source,
  target: params.target,
  data: { input: params.input, output: params.output },
});
