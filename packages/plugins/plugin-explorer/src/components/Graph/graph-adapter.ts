//
// Copyright 2023 DXOS.org
//

import * as GraphEdge from '@dxos/graph/GraphEdge';
import * as GraphModel from '@dxos/graph/GraphModel';
import * as GraphNode from '@dxos/graph/GraphNode';

export type ForceNode = {
  id?: string;
};

export type ForceLink = {
  source?: string;
  target?: string;
};

export type GraphData = {
  nodes: ForceNode[];
  links: ForceLink[];
};

/**
 * Map common graph to force-graph format.
 */
export class GraphAdapter implements GraphData {
  private readonly _nodes: ForceNode[] = [];
  private readonly _links: ForceLink[] = [];

  constructor(private readonly graph: GraphModel.AnyData) {
    this._nodes = graph.nodes.map((node: GraphNode.Any) => ({
      id: node.id,
      type: node.type,
      data: node.data,
    }));

    // Build a set of node IDs for efficient lookup.
    const nodeIds = new Set(this._nodes.map((node) => node.id));

    // Filter out edges where source or target node doesn't exist.
    this._links = graph.edges
      .filter((edge: GraphEdge.Any) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
      .map((edge: GraphEdge.Any) => ({
        type: edge.type,
        source: edge.source,
        target: edge.target,
        data: edge.data,
      }));
  }

  get nodes() {
    return this._nodes;
  }

  get links() {
    return this._links;
  }
}
