//
// Copyright 2024 DXOS.org
//

import { type GraphNode, type ReadonlyGraphModel } from '@dxos/graph';
import { type Point, type Rect } from '@dxos/react-ui-canvas';

import { type DragDropPayload } from './useDragMonitor';
import { useEditorContext } from './useEditorContext';
import { type ShapeRegistry, type Anchor, defaultAnchorSize } from '../components';
import { createAnchorId, parseAnchorId } from '../compute';
import { getDistance, findClosestIntersection, createNormalsFromRectangles, getRect, pointAdd } from '../layout';
import { createPath } from '../shapes';
import { type Connection, isPolygon, type PathShape, type Polygon, type Shape } from '../types';

export type Layout = {
  shapes: Shape[];
};

/**
 * Generate layout from graph (including linking).
 */
export const useLayout = (): Layout => {
  const { dragMonitor, graph, registry } = useEditorContext();

  // TODO(burdon): Use to trigger state update.
  const dragging = dragMonitor.state(({ type }) => type === 'frame' || type === 'anchor').value;
  const getShape = (shape: Polygon) =>
    dragging.type === 'frame' && dragging.shape.id === shape.id ? dragging.shape : shape;

  type LinkProps = { id: string; source: Polygon; target: Polygon; connection?: Connection };
  const createPathForEdge = ({ id, source, target, connection }: LinkProps): PathShape | undefined => {
    // TODO(burdon): Custom logic for function anchors.
    const sourceAnchor = getAnchorPoint(registry, source, createAnchorId('output', connection?.output));
    const targetAnchor = getAnchorPoint(registry, target, createAnchorId('input', connection?.input));
    if (sourceAnchor && targetAnchor) {
      return createPath({ id, points: createCurve(sourceAnchor, targetAnchor) });
    }

    const sourceBounds = getNodeBounds(source);
    const targetBounds = getNodeBounds(target);
    if (sourceBounds?.center && targetBounds?.center) {
      const points = createCenterPoints(sourceBounds, targetBounds);
      if (points) {
        return createPath({ id, points, end: 'arrow-end' });
      }
    }
  };

  // TODO(burdon): Cache with useMemo? Can we determine what changed?
  const shapes: Shape[] = [];

  //
  // Edges.
  //
  graph.edges.forEach(({ id, source: sourceId, target: targetId, data: connection }) => {
    const sourceNode = graph.getNode(sourceId);
    const targetNode = graph.getNode(targetId);
    if (!sourceNode || !targetNode || !isPolygon(sourceNode.data) || !isPolygon(targetNode.data)) {
      return;
    }

    const source = getShape(sourceNode.data);
    const target = getShape(targetNode.data);
    const path = createPathForEdge({ id, source, target, connection });
    if (path) {
      shapes.push(path);
    }
  });

  //
  // Linking.
  //
  if (dragging?.type === 'anchor' && dragging.pointer) {
    let points: Point[] | undefined;
    if (dragging.anchor) {
      const [direction] = parseAnchorId(dragging.anchor.id);
      if (direction) {
        const sourceAnchor = getAnchorPoint(registry, dragging.shape, dragging.anchor.id);
        if (sourceAnchor) {
          let targetAnchor =
            dragging.target?.type === 'anchor' &&
            getAnchorPoint(registry, dragging.target.shape, dragging.target.anchor.id);
          if (!targetAnchor) {
            targetAnchor = dragging.pointer;
          }

          points = createCurve(sourceAnchor, targetAnchor);
        }
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

// TODO(burdon): Generalize and move to geometry.

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
    const [s1, s2] = createNormalsFromRectangles(source.bounds, target.bounds, len) ?? [];
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

const createCurve = (source: Point, target: Point) => [
  source,
  // pointAdd(source, { x: defaultAnchorSize.width / 2, y: 0 }),
  pointAdd(source, { x: defaultAnchorSize.width, y: 0 }),
  pointAdd(target, { x: -defaultAnchorSize.width, y: 0 }),
  // pointAdd(target, { x: -defaultAnchorSize.width, y: 0 }),
  target,
];

// TODO(burdon): Cache anchor positions? (runtime representation of shapes and paths).
const getAnchorPoint = (registry: ShapeRegistry, shape: Polygon, anchorId: string): Point | undefined => {
  const anchors = registry.getShapeDef(shape.type)?.getAnchors?.(shape);
  const anchor = anchors?.[anchorId];
  return anchor?.pos;
};

export const getClosestAnchor = (
  graph: ReadonlyGraphModel<GraphNode<any>>,
  registry: ShapeRegistry,
  pos: Point,
  test: (shape: Polygon, anchor: Anchor, d: number) => boolean,
): Extract<DragDropPayload, { type: 'anchor' }> | undefined => {
  let min = Infinity;
  let closest: Extract<DragDropPayload, { type: 'anchor' }> | undefined;
  graph.nodes.forEach(({ data: shape }) => {
    const anchors = registry.getShapeDef(shape.type)?.getAnchors?.(shape);
    if (anchors) {
      for (const anchor of Object.values(anchors)) {
        const d = getDistance(pos, anchor.pos);
        if (min > d && test(shape, anchor, d)) {
          min = d;
          closest = { type: 'anchor', shape, anchor };
        }
      }
    }
  });

  return closest;
};
