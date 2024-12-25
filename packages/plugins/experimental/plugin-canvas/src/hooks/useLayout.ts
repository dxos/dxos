//
// Copyright 2024 DXOS.org
//

import { type GraphModel, type GraphNode } from '@dxos/graph';
import { invariant } from '@dxos/invariant';
import { type Point, type Rect } from '@dxos/react-ui-canvas';

import { createPath, distance, findClosestIntersection, getNormals, getRect } from '../layout';
import { type PolygonShape, type Shape } from '../types';

export type Layout = {
  shapes: Shape[];
};

/**
 * Generate layout.
 */
export const useLayout = (graph: GraphModel<GraphNode<Shape>>, dragging?: PolygonShape, debug?: boolean): Layout => {
  const shapes: Shape[] = [];

  // Layout edges.
  graph.edges.forEach(({ id, source, target, data }) => {
    const { center: p1, bounds: r1 } = getNodeBounds(dragging, graph.getNode(source)) ?? {};
    const { center: p2, bounds: r2 } = getNodeBounds(dragging, graph.getNode(target)) ?? {};
    if (!p1 || !p2) {
      return;
    }

    invariant(r1 && r2);

    let points: Point[] = [];
    const d = distance(p1, p2);
    if (d > 256) {
      const [s1, s2] = getNormals(r1, r2, 32) ?? [];
      if (s1 && s2) {
        points = [s1[1], s1[0], s2[0], s2[1]];
      }
    }

    if (!points.length) {
      const i1 = findClosestIntersection([p2, p1], r1) ?? p1;
      const i2 = findClosestIntersection([p1, p2], r2) ?? p2;
      points = [i1, i2];
    }

    // TODO(burdon): Move point to closest free anchor.
    shapes.push(createPath({ id, points, start: 'circle', end: 'arrow-end' }));
  });

  // Layout nodes.
  graph.nodes.forEach(({ data: shape }) => {
    shapes.push(shape);
  });

  return { shapes };
};

const getNodeBounds = (
  dragging: PolygonShape | undefined,
  node: GraphNode<Shape> | undefined,
): { center: Point; bounds: Rect } | undefined => {
  if (!node) {
    return undefined;
  }

  if (dragging?.id === node.id) {
    return {
      center: dragging.center,
      bounds: getRect(dragging.center, dragging.size),
    };
  } else {
    return {
      center: node.data.center,
      bounds: getRect(node.data.center, node.data.size),
    };
  }
};
