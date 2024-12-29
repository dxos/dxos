//
// Copyright 2024 DXOS.org
//

import { type GraphNode, type ReadonlyGraphModel } from '@dxos/graph';
import { type Point, type Rect } from '@dxos/react-ui-canvas';

import { useEditorContext } from './useEditorContext';
import { type Anchor, type ShapeRegistry } from '../components';
import { getDistance, findClosestIntersection, getNormals, getRect, pointAdd } from '../layout';
import { createPath } from '../shapes';
import { isPolygon, type Polygon, type Shape } from '../types';

export type Layout = {
  shapes: Shape[];
};

/**
 * Generate layout from graph (including linking).
 */
export const useLayout = (): Layout => {
  const { monitor, graph, registry } = useEditorContext();

  // TODO(burdon): Use to trigger state update.
  const dragging = monitor.state(({ type }) => type === 'frame' || type === 'anchor').value;
  const getShape = (shape: Polygon) =>
    dragging.type === 'frame' && dragging.shape.id === shape.id ? dragging.shape : shape;

  // TODO(burdon): Cache with useMemo.
  const shapes: Shape[] = [];

  //
  // Edges.
  //
  graph.edges.forEach(({ id, source: sourceId, target: targetId, data }) => {
    const sourceNode = graph.getNode(sourceId);
    const targetNode = graph.getNode(targetId);
    if (!sourceNode || !targetNode || !isPolygon(sourceNode.data) || !isPolygon(targetNode.data)) {
      return;
    }

    const source = getShape(sourceNode.data);
    const target = getShape(targetNode.data);

    // TODO(burdon): Custom logic for function anchors (e.g., assumes source is always the output.)
    if (data) {
      const { property } = data;
      const sourceAnchor = getAnchorPoint(registry, source, '#output');
      const targetAnchor = getAnchorPoint(registry, target, property);
      if (sourceAnchor && targetAnchor) {
        const offset = 16;
        return shapes.push(
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
      }
    }

    const sourceBounds = getNodeBounds(source);
    const targetBounds = getNodeBounds(target);
    if (sourceBounds?.center && targetBounds?.center) {
      const points = createCenterPoints(sourceBounds, targetBounds);
      if (points) {
        return shapes.push(createPath({ id, points, end: 'arrow-end' }));
      }
    }
  });

  //
  // Linking.
  //
  if (dragging?.type === 'anchor' && dragging.pointer) {
    let points: Point[] | undefined;
    if (dragging.anchor) {
      // TODO(burdon): Check if snapped to anchor.
      const pos = getAnchorPoint(registry, dragging.shape, dragging.anchor.id);
      if (pos) {
        points = [pos, dragging.pointer];
      }
    }

    if (!points) {
      const rect = getRect(dragging.shape.center, dragging.shape.size);
      const pos = findClosestIntersection([dragging.pointer, dragging.shape.center], rect) ?? dragging.shape.center;
      points = [pos, dragging.pointer];
    }

    // Show anchor.
    shapes.push(createPath({ id: 'link', points, end: 'circle' }));
  }

  //
  // Nodes.
  //
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

const createCenterPoints = (source: Bounds, target: Bounds, len = 32): Point[] => {
  let points: Point[] = [];

  // Curve.
  const d = getDistance(source.center, target.center);
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

// TODO(burdon): Cache anchor positions? (runtime representation of shapes and paths).
const getAnchorPoint = (registry: ShapeRegistry, shape: Shape, property: string): Point | undefined => {
  const anchors = registry.getShape(shape.type)?.getAnchors?.(shape);
  const anchor = anchors?.[property];
  return anchor?.pos;
};

// TODO(burdon): Generalize function to be a compute node with anchors.
export const getClosestAnchor = (
  graph: ReadonlyGraphModel<GraphNode<Shape>>,
  registry: ShapeRegistry,
  pos: Point,
  test: (shape: Polygon, anchor: Anchor, d: number) => boolean,
): Anchor | undefined => {
  let min = Infinity;
  let closest: Anchor | undefined;
  graph.nodes
    .filter(({ data }) => data.type === 'function')
    .forEach(({ data: shape }) => {
      const anchors = registry.getShape(shape.type)?.getAnchors?.(shape);
      if (anchors) {
        for (const [_, anchor] of Object.entries(anchors)) {
          const d = getDistance(pos, anchor.pos);
          if (min > d && test(shape, anchor, d)) {
            min = d;
            closest = anchor;
          }
        }
      }
    });

  return closest;
};
