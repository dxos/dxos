//
// Copyright 2021 DXOS.org
//

//
// Data
// Generic graph data type.
//

import { type Graph } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { type Point } from '@dxos/react-ui-graph';

export type IdAccessor<N = any> = (node: N) => string;

export const defaultIdAccessor: IdAccessor = (node: any) => {
  invariant(node.id);
  return node.id;
};

export const emptyGraph: Graph = {
  nodes: [],
  edges: [],
};

//
// Layout
// Graph layout used by graph renderers.
//

export type GraphGuide = {
  id: string;
  type: string;
  cx: number;
  cy: number;
  r: number;
  classes?: {
    circle?: string;
  };
};

export type GraphLayoutNode<N = any> = {
  id: string;
  data?: N;
  x?: number;
  y?: number;
  r?: number;
  classes?: {
    circle?: string;
    text?: string;
  };
  children?: number;
  initialized?: boolean;
  last?: Point;
};

export type GraphLayoutEdge<N = any> = {
  id: string;
  source: GraphLayoutNode<N>;
  target: GraphLayoutNode<N>;
  classes?: {
    path?: string;
  };
};

export type GraphLayout<N = any> = {
  guides?: GraphGuide[];
  graph: {
    nodes: GraphLayoutNode<N>[];
    edges: GraphLayoutEdge<N>[];
  };
};
