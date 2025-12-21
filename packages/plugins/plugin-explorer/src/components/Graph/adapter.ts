//
// Copyright 2023 DXOS.org
//

import { type Graph } from '@dxos/graph';

export type GraphNode = {
  id?: string;
};

export type GraphLink = {
  source?: string;
  target?: string;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

/**
 * Map common graph to force-graph format.
 */
export class GraphAdapter implements GraphData {
  private readonly _nodes: GraphNode[] = [];
  private readonly _links: GraphLink[] = [];

  constructor(private readonly graph: Graph.Any) {
    this._nodes = graph.nodes.map((node: Graph.Node.Any) => ({
      id: node.id,
      type: node.type,
      data: node.data,
    }));

    this._links = graph.edges.map((edge: Graph.Edge.Any) => ({
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
