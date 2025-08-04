//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type Point, type Rect } from '@dxos/react-ui-canvas';

import { type Anchor, type ShapeLayout, defaultAnchorSize } from '../components';
import { createNormalsFromRectangles, findClosestIntersection, getDistance, getRect, pointAdd } from '../layout';
import { createAnchorId, createPath, parseAnchorId } from '../shapes';
import {
  type CanvasGraphModel,
  type Connection,
  type Layout,
  type PathShape,
  type Polygon,
  type Shape,
  isPolygon,
} from '../types';

import { type DragDropPayload } from './useDragMonitor';
import { useEditorContext } from './useEditorContext';

/**
 * Generate layout from graph (including linking).
 */
export const useLayout = (): Layout => {
  const { dragMonitor, graph, layout } = useEditorContext();

  // TODO(burdon): Use to trigger state update.
  const dragging = dragMonitor.state(({ type }) => type === 'frame' || type === 'resize' || type === 'anchor').value;
  const getShape = (shape: Polygon) =>
    (dragging.type === 'frame' || dragging.type === 'resize') && dragging.shape.id === shape.id
      ? dragging.shape
      : shape;

  const createPathForEdge = ({
    id,
    source: sourceId,
    target: targetId,
    output,
    input,
  }: Connection): PathShape | undefined => {
    const sourceNode = graph.getNode(sourceId);
    const targetNode = graph.getNode(targetId);
    if (!sourceNode || !targetNode || !isPolygon(sourceNode) || !isPolygon(targetNode)) {
      return;
    }

    const source = getShape(sourceNode);
    const target = getShape(targetNode);
    // TODO(burdon): Custom logic for function anchors. Generalize.
    if (output && input) {
      const sourceAnchor = getAnchorPoint(layout, source, createAnchorId('output', output));
      const targetAnchor = getAnchorPoint(layout, target, createAnchorId('input', input));
      if (sourceAnchor && targetAnchor) {
        return createPath({ id, points: createCurve(sourceAnchor, targetAnchor) });
      }
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
  graph.edges.forEach((edge) => {
    const path = createPathForEdge(edge);
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
        const sourceAnchor = getAnchorPoint(layout, dragging.shape, dragging.anchor.id);
        if (sourceAnchor) {
          let targetAnchor =
            dragging.snapTarget?.type === 'anchor' &&
            getAnchorPoint(layout, dragging.snapTarget.shape, dragging.snapTarget.anchor.id);
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
  graph.nodes.forEach((shape) => {
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

const getAnchorPoint = (layout: ShapeLayout, shape: Polygon, anchorId: string): Point | undefined => {
  invariant(shape.type);
  const anchors = layout.getAnchors(shape);
  const anchor = anchors?.[anchorId];
  return pointAdd(shape.center, anchor?.pos ?? { x: 0, y: 0 });
};

export const getClosestAnchor = (
  layout: ShapeLayout,
  graph: CanvasGraphModel<Polygon>,
  pos: Point,
  isValid: (shape: Polygon, anchor: Anchor, d: number) => boolean,
): Extract<DragDropPayload, { type: 'anchor' }> | undefined => {
  let min = Infinity;
  let closest: Extract<DragDropPayload, { type: 'anchor' }> | undefined;
  graph.nodes.forEach((shape) => {
    const anchors = layout.getAnchors(shape);
    if (anchors) {
      for (const anchor of Object.values(anchors)) {
        const d = getDistance(pos, pointAdd(shape.center, anchor.pos));
        if (min > d && isValid(shape, anchor, d)) {
          min = d;
          closest = { type: 'anchor', shape, anchor };
        }
      }
    }
  });

  return closest;
};
