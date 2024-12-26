//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type Point, type Rect } from '@dxos/react-ui-canvas';

import { useEditorContext } from './useEditorContext';
import { distance, findClosestIntersection, getNormals, getRect, pointAdd } from '../layout';
import { createPath } from '../shapes';
import { isPolygon, type Polygon, type Shape } from '../types';

export type Layout = {
  shapes: Shape[];
};

/**
 * Generate layout.
 */
export const useLayout = (): Layout => {
  const { graph, registry, monitor } = useEditorContext();
  const { shape: dragging } = monitor.state('frame').value;
  const shapes: Shape[] = [];

  // Layout edges.
  graph.edges.forEach(({ id, source: _source, target: _target, data }) => {
    const source = graph.getNode(_source);
    const target = graph.getNode(_target);
    if (!source || !target || !isPolygon(source.data) || !isPolygon(target.data)) {
      return;
    }

    const { center: p1, bounds: r1 } = getNodeBounds(source.data, dragging) ?? {};
    const { center: p2, bounds: r2 } = getNodeBounds(target.data, dragging) ?? {};
    if (!p1 || !p2) {
      return;
    }

    // TODO(burdon): Custom handling of anchors.
    if (data) {
      // TODO(burdon): Cache anchor positions (runtime representation of shapes and paths).
      const getAnchors = (shape: Shape) =>
        registry.getShape(shape.type)?.getAnchors?.(shape, dragging?.id === shape.id ? dragging?.center : undefined);
      const sourceAnchor = getAnchors(source.data)?.['#output'];
      const targetAnchor = getAnchors(target.data)?.[data.property];
      if (sourceAnchor && targetAnchor) {
        shapes.push(
          createPath({
            id,
            points: [
              sourceAnchor.pos,
              pointAdd(sourceAnchor.pos, { x: 10, y: 0 }),
              pointAdd(targetAnchor.pos, { x: -10, y: 0 }),
              targetAnchor.pos,
            ],
          }),
        );
      }
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

    // Direct path.
    if (!points.length) {
      const i1 = findClosestIntersection([p2, p1], r1) ?? p1;
      const i2 = findClosestIntersection([p1, p2], r2) ?? p2;
      points = [i1, i2];
    }

    shapes.push(
      createPath({
        id,
        points,
        start: 'circle',
        end: 'arrow-end',
      }),
    );
  });

  // Layout nodes.
  graph.nodes.forEach(({ data: shape }) => {
    shapes.push(shape);
  });

  return { shapes };
};

const getNodeBounds = (
  shape: Polygon | undefined,
  dragging: Polygon | undefined,
): { center: Point; bounds: Rect } | undefined => {
  if (!shape) {
    return undefined;
  }

  if (dragging?.id === shape.id) {
    return {
      center: dragging.center,
      bounds: getRect(dragging.center, dragging.size),
    };
  } else {
    return {
      center: shape.center,
      bounds: getRect(shape.center, shape.size),
    };
  }
};
