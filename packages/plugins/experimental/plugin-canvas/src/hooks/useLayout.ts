//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type Point, type Rect } from '@dxos/react-ui-canvas';

import { type GraphModel, type Node } from '../graph';
import { createLine, findClosestIntersection, getRect } from '../layout';
import { type PolygonShape, type Shape } from '../types';

export type Layout = {
  shapes: Shape[];
};

/**
 * Generate layout.
 */
// TODO(burdon): Graph hierarchy?
export const useLayout = (graph: GraphModel<Node<Shape>>, dragging?: PolygonShape, debug?: boolean): Layout => {
  const shapes: Shape[] = [];

  graph.edges.forEach(({ id, source, target }) => {
    const { center: p1, bounds: r1 } = getNodeBounds(dragging, graph.getNode(source)) ?? {};
    const { center: p2, bounds: r2 } = getNodeBounds(dragging, graph.getNode(target)) ?? {};
    if (!p1 || !p2) {
      return;
    }

    if (debug) {
      shapes.push(createLine({ id: `${id}-guide`, p1, p2, guide: true }));
    }

    invariant(r1 && r2);
    const i1 = findClosestIntersection([p2, p1], r1) ?? p1;
    const i2 = findClosestIntersection([p1, p2], r2) ?? p2;
    const line = createLine({ id, p1: i1, p2: i2, start: 'circle', end: 'arrow-end' });
    shapes.push(line);
  });

  graph.nodes.forEach(({ data: shape }) => {
    shapes.push(shape);
  });

  return { shapes };
};

const getNodeBounds = (
  dragging: PolygonShape | undefined,
  node: Node<Shape> | undefined,
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
