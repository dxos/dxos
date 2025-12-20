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

export const emptyGraph: Graph.Graph = {
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
  type?: string;
  order?: number;
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
  type?: string;
  order?: number;
  source: GraphLayoutNode<NodeData>;
  target: GraphLayoutNode<NodeData>;
  data?: EdgeData;
  linkForce?: boolean;
  classes?: {
    path?: string;
  };
};

export type GraphLayout<NodeData = any, EdgeData = any> = {
  id?: string;
  guides?: GraphGuide[];
  graph: {
    nodes: GraphLayoutNode<NodeData>[];
    edges: GraphLayoutEdge<NodeData, EdgeData>[];
  };
};
