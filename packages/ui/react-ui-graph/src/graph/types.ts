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

export type GraphLayoutNode<Data = any> = {
  id: string;
  data?: Data;
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

export type GraphLayoutEdge<Data = any> = {
  id: string;
  source: GraphLayoutNode<Data>;
  target: GraphLayoutNode<Data>;
  classes?: {
    path?: string;
  };
};

export type GraphLayout<Data = any> = {
  guides?: GraphGuide[];
  graph: {
    nodes: GraphLayoutNode<Data>[];
    edges: GraphLayoutEdge<Data>[];
  };
};
