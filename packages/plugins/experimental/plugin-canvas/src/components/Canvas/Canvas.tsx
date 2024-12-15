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
import { Line } from './Line';
import { type DragPayloadData, useShapes, Shapes, useSelectionHandler } from './Shape';
import { createLine, createRect, type Shape } from '../../graph';
import { useActionHandler, useEditorContext, useShortcuts, useSnap, useTransform } from '../../hooks';
import { useWheel } from '../../hooks/useWheel';
import { boundsToModel, findClosestIntersection, getBounds, getInputPoint, type Point } from '../../layout';
import { createId, itemSize } from '../../testing';
import { Grid } from '../Grid';
import { eventsNone, styles } from '../styles';
import { testId } from '../util';

/**
 * Main canvas component.
 */
export const Canvas = () => {
  const { width, height, scale, offset, graph, showGrid, dragging, setTransform } = useEditorContext();

  // Canvas.
  const containerRef = useRef<HTMLDivElement>(null);
  const { ready, styles: transformStyles } = useTransform();

  // Event handlers.
  useWheel(containerRef.current, width, height, setTransform);
  useShortcuts(containerRef.current);
  useActionHandler();

  // Drop target.
  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    return dropTargetForElements({
      element: containerRef.current,
      getData: () => ({ type: 'canvas' }),
    });
  }, [containerRef.current]);

  // Dragging and linking.
  const { frameDragging, overlay } = useDragMonitor(containerRef.current);

  // Shapes.
  const shapes = useShapes(graph, frameDragging);
  const selectionRect = useSelectionHandler(containerRef.current, shapes);

  return (
    <div {...testId('dx-canvas')} ref={containerRef} tabIndex={0} className={mx('absolute inset-0 overflow-hidden')}>
      {/* Background. */}
      <Background />

      {/* Grid. */}
      {ready && showGrid && <Grid offset={offset} scale={scale} />}

      {/* Content. */}
      <Shapes shapes={shapes} />

      {/* Overlays. */}
      <div {...testId('dx-overlays')} className={mx('absolute', eventsNone)}>
        {/* Selection overlay. */}
        {selectionRect && (
          <svg className='absolute overflow-visible cursor-crosshair'>
            <rect {...selectionRect} className={styles.cursor} />
          </svg>
        )}

        {/* Linking overlay. */}
        {overlay && (
          <div className='absolute' style={transformStyles}>
            <Line shape={overlay} />
          </div>
        )}

        {/* Drag preview. */}
        {dragging &&
          createPortal(
            <div style={transformStyles}>
              <FrameDragPreview scale={scale} shape={dragging.shape} />
            </div>,
            dragging.container,
          )}
      </div>
    </div>
  );
};

/**
 * Monitor frames and anchors being dragged.
 */
const useDragMonitor = (el: HTMLElement | null) => {
  const { scale, offset, graph, selection, setDragging, setLinking } = useEditorContext();
  const snapPoint = useSnap();

  const [frameDragging, setFrameDragging] = useState<Shape>();
  const [overlay, setOverlay] = useState<Shape>();
  const cancelled = useRef(false);

  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        invariant(el);
        const rect = el.getBoundingClientRect();
        const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
        const { type, shape } = source.data as DragPayloadData;
        invariant(shape.type === 'rect'); // TODO(burdon): Handle lines?

        switch (type) {
          case 'frame': {
            setFrameDragging({ ...shape, pos });
            break;
          }

          case 'anchor': {
            setOverlay(createLineOverlay(shape, pos));
            break;
          }
        }
      },

      // Dragging cancelled if user presses Esc.
      // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/events#cancelling
      onDropTargetChange: ({ source, location }) => {
        cancelled.current = location.current.dropTargets.length === 0;
      },

      onDrop: ({ source, location }) => {
        if (!cancelled.current) {
          invariant(el);
          const rect = el.getBoundingClientRect();
          // TODO(burdon): Adjust for offset?
          // const pos = boundsToModelWithOffset(rect, scale, offset, shape.pos, location.initial, location.current);
          const pos = boundsToModel(rect, scale, offset, getInputPoint(location.current.input));
          const { type, shape } = source.data as DragPayloadData;
          invariant(shape.type === 'rect'); // TODO(burdon): Handle lines?

          switch (type) {
            case 'frame': {
              shape.pos = snapPoint(pos);
              shape.rect = getBounds(shape.pos, shape.size);
              break;
            }

            case 'anchor': {
              const target = location.current.dropTargets.find(({ data }) => data.type === 'frame')?.data
                .shape as Shape;
              let id = target?.id;
              if (!id) {
                // TODO(burdon): Use action handler to reuse undo.
                id = createId();
                graph.addNode({ id, data: createRect({ id, pos: snapPoint(pos), size: itemSize }) });
                selection.setSelected([id]);
              }
              graph.addEdge({ id: createId(), source: shape.id, target: id, data: {} });
              break;
            }
          }
        }

        setDragging(undefined);
        setLinking(undefined);
        setFrameDragging(undefined);
        setOverlay(undefined);
      },
    });
  }, [el, graph, selection, scale, offset, snapPoint]);

  return { frameDragging, overlay };
};

const createLineOverlay = (source: Shape, p2: Point): Shape | undefined => {
  if (source.type === 'rect') {
    const { pos, rect } = source;
    const p1 = findClosestIntersection([p2, pos], rect) ?? pos;
    return createLine({ id: 'link', p1, p2 });
  }
};
