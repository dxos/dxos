//
// Copyright 2025 DXOS.org
//

import { Schema as S } from '@effect/schema';

import { ObjectId, Ref, TypedObject } from '@dxos/echo-schema';
import { createEdgeId, type GraphEdge, Graph, GraphModel, type GraphNode } from '@dxos/graph';
import { create, makeRef } from '@dxos/live-object';

import { ComputeNode, type ComputeEdge } from '../schema';

// TODO(burdon): Graph of graphs: Inline node or reference to other graph.

// TODO(burdon): Reconcile type with plugin-canvas.
export class ComputeGraphType extends TypedObject({
  typename: 'dxos.org/type/ComputeGraph',
  version: '0.1.0',
})({
  graph: Graph,
  input: S.optional(ComputeNode),
  output: S.optional(ComputeNode),
}) {}

const isComputeGraph = S.is(ComputeGraphType);

// TODO(burdon): Reconcile/merge with ComputeNode.
export const ComputeGraphNode = S.Struct({
  type: S.optional(S.String),

  /**
   * For composition nodes.
   */
  subgraph: S.optional(Ref(ComputeGraphType)),

  /**
   * For switch nodes.
   */
  // TODO(dmaretskyi): Move to constants.
  enabled: S.optional(S.Boolean),
});

export type ComputeGraphNode = S.Schema.Type<typeof ComputeGraphNode>;

// TODO(burdon): Reconcile types.
// export type ComputeGraphModel = GraphModel<GraphNode<ComputeGraphNode>, GraphEdge<ComputeEdge>>;

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
