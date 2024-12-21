//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { type Point, useProjection } from '@dxos/react-ui-canvas';

import { useActionHandler } from './useActionHandler';
import { useEditorContext } from './useEditorContext';
import { useSnap } from './useSnap';
import { createLine, createRectangle, findClosestIntersection, getInputPoint, getRect } from '../layout';
import { createId, itemSize } from '../testing';
import { type PolygonShape, type LineShape } from '../types';

/**
 * Data associated with a draggable.
 */
export type DragPayloadData<S extends PolygonShape = PolygonShape> = {
  type: 'frame' | 'anchor' | 'tool';
  anchor?: string; // TODO(burdon): id.
  shape: S;
};

/**
 * Monitor frames and anchors being dragged.
 */
export const useDragMonitor = (el: HTMLElement | null) => {
  const { graph, selection, dragging, setDragging, linking, setLinking } = useEditorContext();
  const { projection } = useProjection();
  const actionHandler = useActionHandler();
  const snapPoint = useSnap();

  const [frameDragging, setFrameDragging] = useState<PolygonShape>();
  const [overlay, setOverlay] = useState<LineShape>();
  const cancelled = useRef(false);

  const lastPointRef = useRef<Point>();
  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        invariant(el);
        const [{ x, y }] = projection.toModel([getInputPoint(el, location.current.input)]);
        const pos = { x, y };
        const { type, shape } = source.data as DragPayloadData<PolygonShape>;
        if (x !== lastPointRef.current?.x || y !== lastPointRef.current?.y) {
          lastPointRef.current = pos;
          switch (type) {
            case 'frame': {
              if (dragging) {
                setFrameDragging({ ...shape, center: pos });
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

      onDrop: async ({ source, location }) => {
        if (!cancelled.current) {
          // TODO(burdon): Adjust for offset on drag?
          invariant(el);
          const [pos] = projection.toModel([getInputPoint(el, location.current.input)]);
          const { type, shape } = source.data as DragPayloadData;

          switch (type) {
            case 'frame': {
              shape.center = snapPoint(pos);

              // TODO(burdon): Copy from other component.
              // if (!graph.getNode(shape.id)) {
              //   graph.addNode({ id: shape.id, data: { ...shape } });
              // }
              break;
            }

            case 'anchor': {
              const target = location.current.dropTargets.find(({ data }) => data.type === 'frame')?.data
                .shape as PolygonShape;
              let id = target?.id;
              if (!id) {
                id = createId();
                const shape = createRectangle({ id, center: snapPoint(pos), size: itemSize });
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
  }, [el, projection, actionHandler, selection, snapPoint, dragging, linking]);

  return { frameDragging, overlay };
};

const createLineOverlay = (source: PolygonShape, pos: Point): LineShape | undefined => {
  const rect = getRect(source.center, source.size);
  const p1 = findClosestIntersection([pos, source.center], rect) ?? source.center;
  return createLine({ id: 'link', p1, p2: pos });
};
