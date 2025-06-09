//
// Copyright 2021 DXOS.org
//

//
// Data
// Generic graph data type.
//

import { type Graph } from '@dxos/graph';
import { invariant } from '@dxos/invariant';

import { type Point } from '../util';

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

export type GraphLayoutNode<NodeData = any> = {
  id: string;
  data?: NodeData;
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

export type GraphLayoutEdge<NodeData = any, EdgeData = any> = {
  id: string;
  source: GraphLayoutNode<NodeData>;
  target: GraphLayoutNode<NodeData>;
  data?: EdgeData;
  linkForce?: boolean;
  classes?: {
    path?: string;
  };
};

export type GraphLayout<NodeData = any, EdgeData = any> = {
  guides?: GraphGuide[];
  graph: {
    nodes: GraphLayoutNode<NodeData>[];
    edges: GraphLayoutEdge<NodeData, EdgeData>[];
  };
};
