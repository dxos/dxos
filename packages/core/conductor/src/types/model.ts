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
import { DXN } from '@dxos/keys';
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
        graph: { id: graph?.id ?? ObjectId.random(), nodes: graph?.nodes ?? [], edges: graph?.edges ?? [] },
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

  //
  // Custom methods.
  //

  createNode({ id, data = {} }: { id?: string; data?: ComputeNode }): GraphNode<ComputeNode> {
    const node: GraphNode<ComputeNode> = { id: id ?? ObjectId.random(), data };
    this.addNode(node);
    return node;
  }

  createEdge(
    source: { node: string | GraphNode<ComputeNode>; property?: string },
    target: { node: string | GraphNode<ComputeNode> | ComputeGraph; property?: string },
  ): GraphEdge<ComputeEdge> {
    const sourceId = typeof source.node === 'string' ? source.node : source.node.id;

    // TODO(burdon): DXN from echo-schema is a different type.
    // Create local intermediate node for the subgraph.
    const targetId = isComputeGraph(target.node)
      ? this.createNode({
          data: {
            type: DXN.parse(target.node.graph.id!).toString(),
            subgraph: makeRef(target.node),
          },
        }).id
      : typeof target.node === 'string'
        ? target.node
        : target.node.id;

    const edge: GraphEdge<ComputeEdge> = {
      id: createEdgeId({ source: sourceId, target: targetId }),
      source: sourceId,
      target: targetId,
      data: {
        output: source.property ?? DEFAULT_INPUT,
        input: target.property ?? DEFAULT_INPUT,
      },
    };

    this.addEdge(edge);
    return edge;
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

  createNode(props: { id?: string; data?: ComputeNode }): this {
    this.model.createNode(props);
    return this;
  }

  createEdge(
    source: { node: string | GraphNode<ComputeNode>; property?: string },
    target: { node: string | GraphNode<ComputeNode> | ComputeGraph; property?: string },
  ): this {
    this.model.createEdge(source, target);
    return this;
  }
}
