//
// Copyright 2025 DXOS.org
//

import { ObjectId } from '@dxos/echo-schema';
import { createEdgeId, type GraphEdge, GraphModel, type GraphNode } from '@dxos/graph';
import { create, makeRef } from '@dxos/live-object';

import { type ComputeGraphNode, ComputeGraphType, type ComputeEdge, isComputeGraph } from '../types';

/**
 * Wrapper/builder.
 */
// TODO(burdon): Rename.
export class ComputeGraphModel {
  /**
   * Create new model.
   */
  static create = (): ComputeGraphModel => {
    return new ComputeGraphModel(
      create(ComputeGraphType, {
        graph: { nodes: [], edges: [] },
      }),
    );
  };

  private readonly _model: GraphModel<GraphNode<ComputeGraphNode>, GraphEdge<ComputeEdge>>;

  constructor(private readonly _graph: ComputeGraphType) {
    this._model = new GraphModel(this._graph.graph);
  }

  toJSON() {
    return this._model.toJSON();
  }

  get graph() {
    return this._graph;
  }

  get model() {
    return this._model;
  }

  // TODO(burdon): Consider same pattern for GraphModel.
  get builder() {
    return new ComputeGraphBuilder(this);
  }

  get(id: string): GraphNode<ComputeGraphNode> {
    return this._model.getNode(id);
  }

  create(id?: string, data: ComputeGraphNode = {}): GraphNode<ComputeGraphNode> {
    const node: GraphNode<ComputeGraphNode> = { id: id ?? ObjectId.random(), data };
    this._model.addNode(node);
    return node;
  }

  link(
    source: { node: GraphNode<ComputeGraphNode>; property: string },
    target: { node: GraphNode<ComputeGraphNode> | ComputeGraphType; property: string },
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

class ComputeGraphBuilder {
  constructor(private readonly _graph: ComputeGraphModel) {}

  call(cb: (graph: ComputeGraphModel) => void): this {
    cb(this._graph);
    return this;
  }

  create(id: string, data: ComputeGraphNode = {}): this {
    this._graph.create(id, data);
    return this;
  }
}

// TODO(burdon): Move into builder.
export const createEdge = (params: {
  source: string;
  output: string;
  target: string;
  input: string;
}): GraphEdge<ComputeEdge> => ({
  // TODO(burdon): Reverse: source_output-input_target
  id: createEdgeId({ source: params.source, target: params.target, relation: `${params.input}-${params.output}` }),
  source: params.source,
  target: params.target,
  data: { input: params.input, output: params.output },
});
