//
// Copyright 2024 DXOS.org
//

import { monitorForElements, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { Background } from './Background';
import { type DragPayloadData, FrameDragPreview, Line, Shapes, useLayout, useSelectionHandler } from './shapes';
import { createLine, createRect, type Shape, type ShapeType } from '../../graph';
import { useActionHandler, useEditorContext, useShortcuts, useSnap, useTransform } from '../../hooks';
import { useWheel } from '../../hooks/useWheel';
import { screenToModel, findClosestIntersection, getRect, getInputPoint, type Point } from '../../layout';
import { createId, itemSize } from '../../testing';
import { Grid } from '../Grid';
import { eventsNone, styles } from '../styles';
import { testId } from '../util';

/**
 * Main canvas component.
 */
export const Canvas = () => {
  const { id, options, debug, width, height, scale, offset, graph, showGrid, dragging, setTransform } =
    useEditorContext();

  // Canvas.
  const containerRef = useRef<HTMLDivElement>(null);
  const { styles: transformStyles } = useTransform();

  // Event handlers.
  useWheel(containerRef.current, width, height, setTransform);
  useShortcuts();

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
  const layout = useLayout(graph, frameDragging, debug);
  const { shapes } = layout;
  const selectionRect = useSelectionHandler(containerRef.current, shapes);

  return (
    <div {...testId('dx-canvas')} ref={containerRef} className={mx('absolute inset-0 overflow-hidden')}>
      {/* Background. */}
      <Background />

      {/* Grid. */}
      {showGrid && <Grid id={id} size={options.gridSize} offset={offset} scale={scale} />}

      {/* Content. */}
      {<Shapes shapes={shapes} style={transformStyles} />}

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
            <Line scale={scale} shape={overlay} />
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
  const { graph, scale, offset, selection, dragging, setDragging, linking, setLinking } = useEditorContext();
  const actionHandler = useActionHandler();
  const snapPoint = useSnap();

  const [frameDragging, setFrameDragging] = useState<Shape>();
  const [overlay, setOverlay] = useState<ShapeType<'line'>>();
  const cancelled = useRef(false);

  const lastPointRef = useRef<Point>();
  useEffect(() => {
    return monitorForElements({
      // NOTE: This seems to be continually called.
      onDrag: ({ source, location }) => {
        invariant(el);
        const [{ x, y }] = screenToModel(scale, offset, [getInputPoint(el, location.current.input)]);
        const pos = { x, y };
        const { type, shape } = source.data as DragPayloadData<ShapeType<'rect'>>;
        if (x !== lastPointRef.current?.x || y !== lastPointRef.current?.y) {
          lastPointRef.current = pos;
          switch (type) {
            case 'frame': {
              if (dragging) {
                setFrameDragging({ ...shape, pos });
              }
              break;
            }

            case 'anchor': {
              if (linking) {
                setOverlay(createLineOverlay(shape, pos));
              }
              break;
            }
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
          // TODO(burdon): Adjust for offset on drag?
          invariant(el);
          const [pos] = screenToModel(scale, offset, [getInputPoint(el, location.current.input)]);
          const { type, shape } = source.data as DragPayloadData<ShapeType<'rect'>>;

          switch (type) {
            case 'frame': {
              shape.pos = snapPoint(pos);
              shape.rect = getRect(shape.pos, shape.size);

              // TODO(burdon): Copy.
              if (!graph.getNode(shape.id)) {
                graph.addNode({ id: shape.id, data: { ...shape } });
              }
              break;
            }

            case 'anchor': {
              const target = location.current.dropTargets.find(({ data }) => data.type === 'frame')?.data
                .shape as Shape;
              let id = target?.id;
              if (!id) {
                id = createId();
                const shape = createRect({ id, pos: snapPoint(pos), size: itemSize });
                await actionHandler({ type: 'create', shape });
              }
              await actionHandler({ type: 'link', source: shape.id, target: id });
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
  }, [el, actionHandler, selection, scale, offset, snapPoint, dragging, linking]);

  return { frameDragging, overlay };
};

const createLineOverlay = (source: Shape, p2: Point): ShapeType<'line'> | undefined => {
  if (source.type === 'rect') {
    const { pos, rect } = source;
    const p1 = findClosestIntersection([p2, pos], rect) ?? pos;
    return createLine({ id: 'link', p1, p2 });
  }
};
