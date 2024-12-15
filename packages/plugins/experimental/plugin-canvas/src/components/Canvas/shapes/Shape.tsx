//
// Copyright 2024 DXOS.org
//

import React, { type CSSProperties, useCallback } from 'react';

import { invariant } from '@dxos/invariant';
import { useDynamicRef } from '@dxos/react-ui';

import { Frame } from './Frame';
import { Line } from './Line';
import { createLine, type GraphModel, type Shape } from '../../../graph';
import { type SelectionEvent, useEditorContext, useSelectionEvents } from '../../../hooks';
import {
  boundsContain,
  boundsToModel,
  findClosestIntersection,
  getBounds,
  type Point,
  type Rect,
} from '../../../layout';
import { testId } from '../../util';

// Ontology:
// TODO(burdon): Separate shapes/layout from data graph.
//  - Graph is a view-like projection of underlying objects.
//  - Layout is a static or dynamic layout of shapes associated with graph nodes.
//  - Shapes are the visual representation of the layout.

/**
 * Data associated with a drag event.
 */
export type DragPayloadData<S extends Pick<Shape, 'type'> = Shape> = {
  type: 'frame' | 'anchor';
  anchor?: string;
  shape: Shape & S;
};

export const Component = ({ shape }: { shape: Shape }) => {
  const { scale, selection } = useEditorContext();
  const { id, type } = shape;
  switch (type) {
    case 'rect': {
      return (
        <Frame
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
          shape={shape}
          selected={selection.contains(id)}
          onSelect={(id, shift) => selection.toggleSelected([id], shift)}
        />
      );
    }

    default:
      return null;
  }
};

/**
 * Render shapes.
 */
export const Shapes = ({ shapes, style }: { shapes: Shape[]; style: CSSProperties }) => {
  return (
    <div {...testId('dx-shapes')} className='absolute' style={style}>
      {shapes.map((shape) => (
        <Component key={shape.id} shape={shape} />
      ))}
    </div>
  );
};

/**
 * Generate shapes.
 */
// TODO(burdon): Create memoized layout.
export const useShapes = (graph: GraphModel, dragging?: Shape, debug?: boolean): Shape[] => {
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

  const shapes: Shape[] = [];

  graph.nodes.forEach(({ data: shape }) => {
    shapes.push(shape);
  });

  graph.edges.forEach(({ id, source, target }) => {
    const { center: p1, bounds: r1 } = getPos(source) ?? {};
    const { center: p2, bounds: r2 } = getPos(target) ?? {};
    if (!p1 || !p2) {
      return;
    }

    if (debug) {
      shapes.push(createLine({ id: `${id}-guide`, p1, p2, guide: true }));
    }

    invariant(r1 && r2);
    const i1 = findClosestIntersection([p2, p1], r1) ?? p1;
    const i2 = findClosestIntersection([p1, p2], r2) ?? p2;
    const line = createLine({ id, p1: i1, p2: i2 });
    shapes.push(line);
  });

  return shapes;
};

/**
 * Event listener to track range bounds selection.
 */
export const useSelectionHandler = (el: HTMLElement | null, shapes: Shape[]) => {
  const { scale, offset, selection } = useEditorContext();
  const shapesRef = useDynamicRef(shapes);

  const handleSelectionBounds = useCallback<SelectionEvent>(
    (bounds, shift) => {
      if (!el || !bounds) {
        selection.clear();
        return;
      }

      // Map the pointer event to the SVG coordinate system.
      const selectionBounds = boundsToModel(el.getBoundingClientRect(), scale, offset, bounds);
      const selected = shapesRef.current
        .filter((shape) => {
          switch (shape.type) {
            case 'rect':
            case 'line':
              return boundsContain(selectionBounds, shape.rect);

            default:
              return false;
          }
        })
        .map(({ id }) => id);

      selection.setSelected(selected, shift);
    },
    [el, scale, offset, selection],
  );

  return useSelectionEvents(el, handleSelectionBounds);
};
