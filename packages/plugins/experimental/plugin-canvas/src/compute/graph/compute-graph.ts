//
// Copyright 2024 DXOS.org
//

import { type Graph, GraphModel, type GraphNode, type GraphEdge } from '@dxos/graph';

import { type ComputeNode } from './compute-node';

/**
 * Dependency graph of compute nodes.
 * Each compute node has an INPUT and OUTPUT type.
 */
// TODO(burdon): The node and edge types should be schema (not the runtime class).
// TODO(burdon): Can GraphModel manage this binding?
export type ComputeGraph = GraphModel<GraphNode<ComputeNode<any, any>, false>, GraphEdge<ComputeEdge, false>>;

export const createComputeGraph = (graph?: Graph): ComputeGraph => {
  return new GraphModel(graph);
};

/**
 * Represents a connection between nodes.
 */
export type ComputeEdge = {
  /** Input prop. */
  input: string;
  /** Output prop. */
  output: string;
};
