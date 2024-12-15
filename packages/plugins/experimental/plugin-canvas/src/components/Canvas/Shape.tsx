//
// Copyright 2024 DXOS.org
//

import React, { useCallback } from 'react';

import { invariant } from '@dxos/invariant';
import { isNotFalsy } from '@dxos/util';

import { Frame } from './Frame';
import { Line } from './Line';
import { type GraphModel, type Shape } from '../../graph';
import { type SelectionEvent, useEditorContext, useSelectionEvents, useTransform } from '../../hooks';
import {
  boundsContain,
  boundsToModel,
  createPathThroughPoints,
  findClosestIntersection,
  getBounds,
  type Point,
  type Rect,
} from '../../layout';
import { testId } from '../util';

/**
 * Data associated with a drag event.
 */
export type DragPayloadData = {
  type: 'frame' | 'anchor';
  shape: Shape;
  anchor?: string;
};

// export abstract class Shape {}
// export class CircleShape implements Shape {}
// export class RectangleShape implements Shape {}

export const Shapes = ({ shapes }: { shapes: Shape[] }) => {
  const { ready, styles: transformStyles } = useTransform();
  const { scale, selection } = useEditorContext();
  if (!ready) {
    return null;
  }

  return (
    <div {...testId('dx-shapes')} className='absolute' style={transformStyles}>
      {shapes.map((shape) => {
        const { id, type } = shape;
        switch (type) {
          case 'rect': {
            return (
              <Frame
                key={id}
                shape={shape}
                scale={scale}
                selected={selection.contains(id)}
                onSelect={(id, shift) => selection.toggleSelected([id], shift)}
              />
            );
          }

          case 'line': {
            return (
              <Line
                key={id}
                shape={shape}
                selected={selection.contains(id)}
                onSelect={(id, shift) => selection.toggleSelected([id], shift)}
              />
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
};

// Ontology:
//  - Graph is a view-like projection of underlying objects.
//  - Layout is a static or dynamic layout of shapes associated with graph nodes.
//  - Shapes are the visual representation of the layout.

// TODO(burdon): Separate shapes/layout from data graph.
export const useShapes = (graph: GraphModel, dragging?: Shape): Shape[] => {
  const getPos = (id: string): { center: Point; bounds: Rect } | undefined => {
    const node = graph.getNode(id);
    if (node) {
      if (dragging?.id === id) {
        invariant(dragging.type === 'rect');
        return {
          center: dragging.pos,
          bounds: getBounds(dragging.pos, dragging.size),
        };
      } else {
        return {
          center: node.data.pos,
          bounds: getBounds(node.data.pos, node.data.size),
        };
      }
    }
  };

  const rects: Shape[] = graph.nodes.map(({ data: shape }) => shape);

  const lines: Shape[] = graph.edges
    .map(({ id, source, target }) => {
      const { center: p1, bounds: r1 } = getPos(source) ?? {};
      const { center: p2, bounds: r2 } = getPos(target) ?? {};
      if (!p1 || !p2) {
        return null;
      }

      invariant(r1 && r2);
      const i1 = findClosestIntersection([p2, p1], r1) ?? p1;
      const i2 = findClosestIntersection([p1, p2], r2) ?? p2;
      return { id, type: 'line', path: createPathThroughPoints([i1, i2]) } satisfies Shape;
    })
    .filter(isNotFalsy);

  return [...rects, ...lines];
};

/**
 * Event listener to track range bounds selection.
 */
export const useSelectionHandler = (el: HTMLElement | null, graph: GraphModel) => {
  const { scale, offset, selection } = useEditorContext();

  const handleSelectionBounds = useCallback<SelectionEvent>(
    (bounds, shift) => {
      if (!el || !bounds) {
        selection.clear();
        return;
      }

      // Map the pointer event to the SVG coordinate system.
      const selectionBounds = boundsToModel(el.getBoundingClientRect(), scale, offset, bounds);
      const selected = graph.nodes
        .filter(
          // Check center point.
          ({ data: { pos } }) => boundsContain(selectionBounds, { ...pos, width: 0, height: 0 }),
        )
        .map(({ id }) => id);
      selection.setSelected(selected, shift);
    },
    [el, scale, offset, selection],
  );

  return useSelectionEvents(el, handleSelectionBounds);
};
