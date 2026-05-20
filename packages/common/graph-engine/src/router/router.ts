//
// Copyright 2026 DXOS.org
//

import { type Path } from '../draw/path';
import { type LayoutEdge, type Point } from '../types';

/**
 * Computes a path between two layout nodes for a given edge.
 */
export interface EdgeRouter<NodeData = any, EdgeData = any> {
  route(edge: LayoutEdge<NodeData, EdgeData>): Path;
  labelPoint(t: number, path: Path): Point;
}
