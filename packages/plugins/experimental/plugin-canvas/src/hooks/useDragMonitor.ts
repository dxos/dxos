//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Point, useProjection } from '@dxos/react-ui-canvas';

import { useEditorContext } from './useEditorContext';
import { useSnap } from './useSnap';
import { findClosestIntersection, getInputPoint, getRect } from '../layout';
import { createPath, createRectangle } from '../shapes';
import { createId, itemSize } from '../testing';
import { type Polygon, type PathShape } from '../types';

/**
 * Data associated with a draggable.
 */
export type DragPayloadData =
  | {
      type: 'tool';
      tool: string;
    }
  | {
      type: 'frame';
      shape: Polygon;
    }
  | {
      type: 'anchor';
      shape: Polygon;
      anchor: string;
    };

/**
 * Monitor frames and anchors being dragged.
 */
export const useDragMonitor = (el: HTMLElement | null) => {
  const { graph, selection, dragging, setDragging, linking, setLinking, actionHandler } = useEditorContext();
  const { projection } = useProjection();
  const snapPoint = useSnap();

  const [frameDragging, setFrameDragging] = useState<Polygon>();
  const [overlay, setOverlay] = useState<PathShape>();
  const cancelled = useRef(false);

  const lastPointRef = useRef<Point>();
  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        invariant(el);
        const [{ x, y }] = projection.toModel([getInputPoint(el, location.current.input)]);
        const pos = { x, y };
        const data = source.data as DragPayloadData;
        if (x !== lastPointRef.current?.x || y !== lastPointRef.current?.y) {
          lastPointRef.current = pos;
          switch (data.type) {
            case 'frame': {
              if (dragging) {
                setFrameDragging({ ...data.shape, center: pos });
              }
              break;
            }

            case 'anchor': {
              if (linking) {
                setOverlay(createLinkOverlay(data.shape, pos));
              }
              break;
            }
          }
        }
      },

      onDrop: async ({ source, location }) => {
        if (!cancelled.current) {
          // TODO(burdon): Adjust for offset on drag?
          invariant(el);
          const [pos] = projection.toModel([getInputPoint(el, location.current.input)]);
          const data = source.data as DragPayloadData;
          switch (data.type) {
            // Tools.
            case 'tool': {
              invariant(dragging?.shape);
              const shape: Polygon = { ...dragging.shape, id: createId(), center: snapPoint(pos) };
              if (shape) {
                await actionHandler?.({ type: 'create', shape });
              }
              break;
            }

            // Dragging.
            case 'frame': {
              data.shape.center = snapPoint(pos);
              // TODO(burdon): Copy from external canvas/component.
              if (!graph.getNode(data.shape.id)) {
                // graph.addNode({ id: shape.id, data: { ...shape } });
                log.info('copy', { shape: data.shape });
              }
              break;
            }

            // Linking.
            case 'anchor': {
              const target = location.current.dropTargets.find(({ data }) => data.type === 'frame')?.data
                .shape as Polygon;
              let id = target?.id;
              if (!id) {
                id = createId();
                const shape = createRectangle({ id, center: snapPoint(pos), size: itemSize });
                await actionHandler?.({ type: 'create', shape });
              } else if (id === data.shape.id) {
                break;
              }
              // TODO(burdon): Add anchor points.
              await actionHandler?.({ type: 'link', source: data.shape.id, target: id });
              if (!target?.id) {
                await actionHandler?.({ type: 'select', ids: [id] });
              }
              break;
            }
          }
        }

        setDragging(undefined);
        setLinking(undefined);
        setFrameDragging(undefined);
        setOverlay(undefined);
      },

      // Dragging cancelled if user presses Esc.
      // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/events#cancelling
      onDropTargetChange: ({ source, location }) => {
        cancelled.current = location.current.dropTargets.length === 0;
      },
    });
  }, [el, projection, actionHandler, selection, snapPoint, dragging, linking]);

  return { frameDragging, overlay };
};

const createLinkOverlay = (source: Polygon, pos: Point): PathShape | undefined => {
  const rect = getRect(source.center, source.size);
  const p1 = findClosestIntersection([pos, source.center], rect) ?? source.center;
  return createPath({ id: 'link', points: [p1, pos] });
};
