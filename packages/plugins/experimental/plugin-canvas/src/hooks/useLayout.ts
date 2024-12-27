//
// Copyright 2024 DXOS.org
//

import { type Point, type Rect } from '@dxos/react-ui-canvas';

import { useEditorContext } from './useEditorContext';
import { type ShapeRegistry } from '../components';
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
  const { monitor, graph, registry } = useEditorContext();
  const { shape: dragging } = monitor.state(({ type }) => type === 'frame').value;
  const { shape: source, pos: linking, anchor } = monitor.state(({ type }) => type === 'anchor').value;

  const shapes: Shape[] = [];

  // Edges.
  graph.edges.forEach(({ id, source: sourceId, target: targetId, data }) => {
    const source = graph.getNode(sourceId);
    const target = graph.getNode(targetId);
    if (!source || !target || !isPolygon(source.data) || !isPolygon(target.data)) {
      return;
    }

    // TODO(burdon): Custom logic for function anchors. Assumes source is always the output.
    if (data) {
      const { property } = data;
      const sourceAnchor = getAnchorPoint(registry, dragging?.id === source.id ? dragging : source.data, '#output');
      const targetAnchor = getAnchorPoint(registry, dragging?.id === target.id ? dragging : target.data, property);
      if (sourceAnchor && targetAnchor) {
        const offset = 16;
        shapes.push(
          createPath({
            id,
            points: [
              sourceAnchor,
              pointAdd(sourceAnchor, { x: offset, y: 0 }),
              pointAdd(targetAnchor, { x: -offset, y: 0 }),
              targetAnchor,
            ],
          }),
        );
        return;
      }
    }

    const sourceBounds = getNodeBounds(dragging?.id === source.id ? dragging : source.data);
    const targetBounds = getNodeBounds(dragging?.id === target.id ? dragging : target.data);
    if (sourceBounds?.center && targetBounds?.center) {
      const points = createCenterPoints(sourceBounds, targetBounds);
      if (points) {
        shapes.push(createPath({ id, points, end: 'arrow-end' }));
      }
    }
  });

  // Linking.
  if (source && linking) {
    let points: Point[] | undefined;
    if (anchor) {
      const pos = getAnchorPoint(registry, source, anchor);
      if (pos) {
        points = [pos, linking];
      }
    }

    if (!points) {
      const rect = getRect(source.center, source.size);
      const pos = findClosestIntersection([linking, source.center], rect) ?? source.center;
      points = [pos, linking];
    }

    shapes.push(createPath({ id: 'link', points }));
  }

  // Nodes.
  graph.nodes.forEach(({ data: shape }) => {
    shapes.push(shape);
  });

  return { shapes };
};

type Bounds = {
  center: Point;
  bounds: Rect;
};

const getNodeBounds = (shape: Polygon): Bounds => ({
  center: shape.center,
  bounds: getRect(shape.center, shape.size),
});

// TODO(burdon): Cache anchor positions? (runtime representation of shapes and paths).
const getAnchorPoint = (registry: ShapeRegistry, shape: Shape, property: string): Point | undefined => {
  const anchors = registry.getShape(shape.type)?.getAnchors?.(shape);
  const anchor = anchors?.[property];
  return anchor?.pos;
};

const createCenterPoints = (source: Bounds, target: Bounds, len = 32): Point[] => {
  let points: Point[] = [];

  // Curve.
  const d = distance(source.center, target.center);
  if (d > 256) {
    const [s1, s2] = getNormals(source.bounds, target.bounds, len) ?? [];
    if (s1 && s2) {
      points = [s1[1], s1[0], s2[0], s2[1]];
    }
  }

  // Direct path.
  if (!points.length) {
    const i1 = findClosestIntersection([target.center, source.center], source.bounds) ?? source.center;
    const i2 = findClosestIntersection([source.center, target.center], target.bounds) ?? target.center;
    points = [i1, i2];
  }

  return points;
};
