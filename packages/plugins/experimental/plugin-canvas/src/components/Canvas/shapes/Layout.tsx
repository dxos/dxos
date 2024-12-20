//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties, useCallback } from 'react';

import { invariant } from '@dxos/invariant';
import { useDynamicRef } from '@dxos/react-ui';

import { DEFS_ID, MARKER_PREFIX, ShapeComponent } from './Shape';
import { type GraphModel, type Node } from '../../../graph';
import { type SelectionEvent, useEditorContext, useSelectionEvents } from '../../../hooks';
import {
  createLine,
  findClosestIntersection,
  getRect,
  pointsToRect,
  rectContains,
  rectToPoints,
  screenToModel,
} from '../../../layout';
import { type PolygonShape, type Point, type Rect, type Shape } from '../../../types';
import { Markers } from '../../svg';
import { testId } from '../../util';

/**
 * Render shapes.
 */
export const Layout = ({ shapes, style }: { shapes: Shape[]; style: CSSProperties }) => {
  const { scale, selection } = useEditorContext();
  const handleSelection = useCallback(
    (id: string, shift: boolean) => selection.toggleSelected([id], shift),
    [selection],
  );

  return (
    <>
      <svg id={DEFS_ID} className='absolute w-8 h-8'>
        <defs>
          <Markers id={MARKER_PREFIX} />
        </defs>
      </svg>
      <div {...testId('dx-layout', true)} className='absolute' style={style}>
        {shapes.map((shape) => (
          <ShapeComponent
            key={shape.id}
            shape={shape}
            scale={scale}
            selected={selection.contains(shape.id)}
            onSelect={handleSelection}
          />
        ))}
      </div>
    </>
  );
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

/**
 * Event listener to track range bounds selection.
 */
export const useSelectionHandler = (el: HTMLElement | null, shapes: Shape[]) => {
  const { scale, offset, selection } = useEditorContext();
  const shapesRef = useDynamicRef(shapes);

  const handleSelectionBounds = useCallback<SelectionEvent>(
    (bounds, shift) => {
      if (!bounds) {
        selection.clear();
        return;
      }

      // Map the pointer event to the SVG coordinate system.
      const selectionBounds = pointsToRect(screenToModel(scale, offset, rectToPoints(bounds)));
      const selected = shapesRef.current
        .filter((shape) => {
          switch (shape.type) {
            case 'rectangle': {
              const rect = getRect(shape.center, shape.size);
              return rectContains(selectionBounds, rect);
            }

            case 'line': {
              return false;
            }

            default:
              return false;
          }
        })
        .map(({ id }) => id);

      selection.setSelected(selected, shift);
    },
    [scale, offset, selection],
  );

  return useSelectionEvents(el, handleSelectionBounds);
};
