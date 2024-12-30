//
// Copyright 2024 DXOS.org
//

import { type Graph, GraphModel, type GraphNode, type GraphEdge } from '@dxos/graph';

import { type ComputeEdge, type ComputeNode } from './state-machine';

/**
 * Dependency graph of compute nodes.
 * Each compute node has an INPUT and OUTPUT type.
 */
export type ComputeGraph = GraphModel<GraphNode<ComputeNode<any, any>>, GraphEdge<ComputeEdge | void>>;

export const createComputeGraph = (graph?: Graph): ComputeGraph => {
  return new GraphModel<GraphNode<ComputeNode<any, any>>, GraphEdge<ComputeEdge | undefined>>(graph);
};
