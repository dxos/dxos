//
// Copyright 2024 DXOS.org
//

import { monitorForElements, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { Background } from './Background';
import { FrameDragPreview } from './Frame';
import { type DragPayloadData, useShapes, Shapes, useSelectionHandler } from './Shape';
import { type Shape } from '../../graph';
import { useActionHandler, useEditorContext, useGraph, useShortcuts, useSnap, useTransform } from '../../hooks';
import { useWheel } from '../../hooks/useWheel';
import {
  boundsToModel,
  createPathThroughPoints,
  findClosestIntersection,
  getBounds,
  getInputPoint,
  type Point,
  type Rect,
} from '../../layout';
import { createId, itemSize } from '../../testing';
import { Grid } from '../Grid';
import { eventsNone, styles } from '../styles';
import { testId } from '../util';

/**
 * Main canvas component.
 */
export const Canvas = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { width, height, scale, offset, showGrid, dragging, setTransform, setDragging, setLinking } =
    useEditorContext();

  // Data model.
  const graph = useGraph();

  // Canvas.
  const { ready, styles: transformStyles } = useTransform();
  const snapPoint = useSnap();

  // Event handlers.
  useWheel(containerRef.current, width, height, setTransform);
  useShortcuts(containerRef.current);
  useActionHandler();
  const selectionBounds = useSelectionHandler(containerRef.current, graph);

  // Drop target.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    return dropTargetForElements({
      element: el,
      getData: () => ({ type: 'canvas' }),
    });
  }, [containerRef.current]);

  const [itemDragging, setItemDragging] = useState<Shape>();
  const [itemLinking, setItemLinking] = useState<{ source: { center: Point; bounds: Rect }; target: Point }>();

  // Monitor dragging and linking.
  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
        const { type, shape } = source.data as DragPayloadData;
        invariant(shape.type === 'rect'); // TODO(burdon): ???
        switch (type) {
          case 'frame': {
            setItemDragging(shape);
            break;
          }

          case 'anchor': {
            setItemLinking({ source: { center: shape.pos, bounds: getBounds(shape.pos, shape.size) }, target: pos });
            break;
          }
        }
      },

      onDrop: ({ source, location }) => {
        const rect = containerRef.current!.getBoundingClientRect();
        const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
        const { type, shape } = source.data as DragPayloadData;
        invariant(shape.type === 'rect'); // TODO(burdon): ???
        switch (type) {
          case 'frame': {
            // TODO(burdon): Adjust for offset.
            // const pos = boundsToModelWithOffset(rect, scale, offset, shape.pos, location.initial, location.current);
            shape.pos = snapPoint(pos);
            setItemDragging(undefined);
            setDragging(undefined);
            break;
          }

          case 'anchor': {
            const target = location.current.dropTargets.find(({ data }) => data.type === 'frame')?.data.item as Shape;
            let id = target?.id;
            if (!id) {
              id = createId();
              graph.addNode({ id, data: { id, pos: snapPoint(pos), size: itemSize } });
            }
            graph.addEdge({ id: createId(), source: shape.id, target: id, data: {} });
            setItemLinking(undefined);
            setLinking(undefined);
            break;
          }
        }
      },
    });
  }, [containerRef, snapPoint, scale, offset, graph]);

  // Shapes
  const shapes = useShapes(graph, itemDragging);

  // TODO(burdon): Overlay.
  if (itemLinking) {
    const { center: p1, bounds: r1 } = itemLinking.source;
    const p2 = itemLinking.target;
    const i1 = r1 ? findClosestIntersection([p2, p1], r1) ?? p1 : p1;
    const i2 = p2;
    shapes.push({ id: 'link', type: 'line', path: createPathThroughPoints([i1, i2]) });
  }

  return (
    <div {...testId('dx-canvas')} ref={containerRef} tabIndex={0} className={mx('absolute inset-0 overflow-hidden')}>
      {/* Background. */}
      <Background />

      {/* Grid. */}
      {ready && showGrid && <Grid offset={offset} scale={scale} />}

      {/* Content. */}
      <Shapes shapes={shapes} />

      {/* Overlays. */}
      <div {...testId('dx-overlays')} className={mx('absolute top-0 left-0 w-full h-full', eventsNone)}>
        {/* Selection overlay. */}
        <svg width='100%' height='100%' className={mx('absolute top-0 left-0 cursor-crosshair')}>
          <g>
            {selectionBounds && <rect {...selectionBounds} opacity={0.2} strokeWidth={2} className={styles.cursor} />}
          </g>
        </svg>

        {/* Drag preview. */}
        {dragging &&
          createPortal(
            <div style={transformStyles}>
              <FrameDragPreview shape={dragging.shape} />
            </div>,
            dragging.container,
          )}
      </div>
    </div>
  );
};
