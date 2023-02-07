//
// Copyright 2021 DXOS.org
//

//
// Data
// Generic graph data type.
//

import assert from 'assert';

import { Point } from '@dxos/gem-core';

export type IdAccessor<N = any> = (node: N) => string;

export const defaultIdAccessor = (node: any) => {
  assert(node.id);
  return node.id;
};

export type GraphLink = {
  id: string;
  source: string;
  target: string;
};

export type GraphData<T> = {
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

export type GraphLayoutNode<N> = {
  id: string;
  data?: N;
  x?: number;
  y?: number;
  r?: number;
  className?: string;
  children?: number;
  initialized?: boolean;
  last?: Point;
};

export type GraphLayoutLink<N> = {
  id: string;
  source: GraphLayoutNode<N>;
  target: GraphLayoutNode<N>;
  className?: string;
};

export type GraphLayout<N> = {
  graph: {
    nodes: GraphLayoutNode<N>[];
    links: GraphLayoutLink<N>[];
  };

  guides?: {
    type: 'circle'; // TODO(burdon): Create typed guides.
    cx: number;
    cy: number;
    r: number;
    className?: string;
  }[];
};
