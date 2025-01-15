//
// Copyright 2025 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import { createEdgeId, type GraphEdge, GraphModel, type GraphNode } from '@dxos/graph';
import { create, makeRef } from '@dxos/live-object';

import { ComputeGraph, type ComputeEdge, type ComputeNode, isComputeGraph } from './graph';

/**
 * Builder.
 */
// TODO(burdon): Generic graph?
export class ComputeGraphModel extends GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>> {
  /**
   * Create new model.
   */
  static create(): ComputeGraphModel {
    return new ComputeGraphModel(
      create(ComputeGraph, {
        graph: { nodes: [], edges: [] },
      }),
    );
  }

  // TODO(burdon): Reconcile with _graph.
  private readonly _computeGraph: ComputeGraph;

  constructor(graph: ComputeGraph) {
    super(graph.graph);
    this._computeGraph = graph;
  }

  get builder() {
    return new ComputeGraphBuilder(this);
  }

  get computeGraph() {
    return this._computeGraph;
  }
}

// TODO(burdon): Same pattern for GraphModel?
class ComputeGraphBuilder {
  constructor(private readonly _model: GraphModel<GraphNode<ComputeNode>, GraphEdge<ComputeEdge>>) {}

  call(cb: (graph: ComputeGraphBuilder) => void): this {
    cb(this);
    return this;
  }

  get(id: string): GraphNode<ComputeNode> {
    return this._model.getNode(id);
  }

  create(id?: string, data: ComputeNode = {}): GraphNode<ComputeNode> {
    const node: GraphNode<ComputeNode> = { id: id ?? ObjectId.random(), data };
    this._model.addNode(node);
    return node;
  }

  link(
    source: { node: GraphNode<ComputeNode>; property: string },
    target: { node: GraphNode<ComputeNode> | ComputeGraph; property: string },
  ): GraphEdge<ComputeEdge> {
    if (isComputeGraph(target.node)) {
      // Create local intermediate node linked to the subgraph.
      target = { ...target, node: this.create(ObjectId.random(), { subgraph: makeRef(target.node) }) };
    }

    const edge: GraphEdge<ComputeEdge> = {
      id: createEdgeId({ source: source.node.id, target: target.node.id }),
      source: source.node.id,
      target: target.node.id,
      data: {
        output: source.property,
        input: target.property,
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
