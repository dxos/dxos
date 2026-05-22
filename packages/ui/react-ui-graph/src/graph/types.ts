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

export const emptyGraph: Graph.Any = {
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
  /** Human-readable label. Synthetic nodes (e.g. cluster root / group) carry this so
   * consumer renderNode callbacks can label them without parsing internal id formats. */
  label?: string;
  /** When true the node remains in the layout but is rendered with opacity 0 and no
   * pointer events — used by the cluster's collapse animation so hidden leaves can
   * tween to their parent's position rather than popping out, and tween back when the
   * parent is re-expanded. */
  hidden?: boolean;
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
  /**
   * Precomputed SVG `d` attribute. When set, the renderer uses this instead of
   * deriving a straight-line path from `source/target` positions. Lets projectors
   * own edge geometry (e.g. radial elbows, bundled curves) without renderer changes.
   */
  path?: string;
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
