//
// Copyright 2021 DXOS.org
//

//
// Data
// Generic graph data type.
//

import { Point } from '@dxos/gem-core';

export type GraphNode = {
  id: string;
};

export type GraphLink = {
  id: string;
  source: string;
  target: string;
};

export type GraphData<T extends GraphNode = GraphNode> = {
  nodes: T[];
  links: GraphLink[];
};

export const emptyGraph: GraphData<any> = {
  nodes: [],
  links: []
};

//
// Layout
// Graph layout used by graph renderers.
//

export type GraphLayoutNode<N extends GraphNode> = {
  id: string;
  data?: N;
  x?: number;
  y?: number;
  r?: number;
  children?: number;
  initialized?: boolean;
  last?: Point;
};

export type GraphLayoutLink<N extends GraphNode> = {
  id: string;
  source: GraphLayoutNode<N>;
  target: GraphLayoutNode<N>;
};

export type GraphLayout<N extends GraphNode> = {
  graph: {
    nodes: GraphLayoutNode<N>[];
    links: GraphLayoutLink<N>[];
  };

  guides?: {
    type: 'circle'; // TODO(burdon): Create typed guides.
    cx: number;
    cy: number;
    r: number;
  }[];
};
