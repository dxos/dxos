//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  type BaseEventPayload,
  type DropTargetRecord,
  type ElementDragType,
} from '@atlaskit/pragmatic-drag-and-drop/types';
import { type Signal, signal } from '@preact/signals-core';
import { useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Point, useProjection } from '@dxos/react-ui-canvas';

import { useEditorContext } from './useEditorContext';
import { createLinkOverlay } from './useLayout';
import { useSnap } from './useSnap';
import { getInputPoint } from '../layout';
import { createRectangle } from '../shapes';
import { createId, itemSize } from '../testing';
import { type Polygon, type PathShape } from '../types';

/**
 * Data property associated with a draggable (DropTargetRecord and ElementDragPayload).
 * - `draggable.getInitialData()`
 * - `dropTargetForElements.getData()`
 */
export type DragDropPayload =
  | {
      type: 'canvas';
    }
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

export type DraggingState = {
  container?: HTMLElement;
  type?: string;
  shape?: Polygon;
  anchor?: string; // TODO(burdon): Change to type?
  pos?: Point;
};

const NULL = signal<DraggingState>({});

// TODO(burdon): Drag controller abstract class.
export class DragMonitor {
  private _state: Signal<DraggingState> = signal<DraggingState>({});

  get dragging(): Signal<DraggingState> {
    return this._state;
  }

  /**
   *
   */
  state(test?: (state: DraggingState) => boolean): Signal<DraggingState> {
    return !test || test(this._state.value) ? this._state : NULL;
  }

  /**
   * Called from setCustomNativeDragPreview.render()
   */
  preview(state: DraggingState) {
    this._state.value = state;
  }

  /**
   *
   */
  drag(state: Omit<DraggingState, 'container'>) {
    this._state.value = { ...this._state.value, ...state };
  }

  /**
   *
   */
  drop() {
    this._state.value = {};
  }

  /**
   * Called by dropTargetForElements.canDrop(DropTargetGetFeedbackArgs)
   */
  canDrop(current: DragDropPayload, dragging: DragDropPayload) {}

  /**
   *
   */
  onDrag(event: BaseEventPayload<ElementDragType>) {}

  /**
   *
   */
  onDrop(event: BaseEventPayload<ElementDragType>) {}
}

/**
 * Monitor frames and anchors being dragged.
 */
export const useDragMonitor = (el: HTMLElement | null) => {
  const { graph, selection, monitor, actionHandler } = useEditorContext();
  const { projection } = useProjection();
  const snapPoint = useSnap();

  const { shape } = monitor.state().value; // TODO(burdon): Remove.
  const [overlay, setOverlay] = useState<PathShape>(); // TODO(burdon): Remove.
  const cancelled = useRef(false);

  const lastPointRef = useRef<Point>();
  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        invariant(el);
        const [pos] = projection.toModel([getInputPoint(el, location.current.input)]);
        const data = source.data as DragDropPayload;
        if (pos.x !== lastPointRef.current?.x || pos.y !== lastPointRef.current?.y) {
          lastPointRef.current = pos;
          switch (data.type) {
            //
            // Drag anchor.
            //
            case 'anchor': {
              // TODO(burdon): Move to anchor class.
              // TODO(burdon): Create path using same logic as layout.
              setOverlay(createLinkOverlay(data.shape, pos));
              break;
            }
          }
        }
      },

      onDrop: async ({ source, location }) => {
        if (!cancelled.current) {
          invariant(el);
          const [pos] = projection.toModel([getInputPoint(el, location.current.input)]);
          const data = source.data as DragDropPayload;
          switch (data.type) {
            //
            // Create shape from tool.
            //
            case 'tool': {
              invariant(shape);
              const created: Polygon = { ...shape, center: snapPoint(pos) };
              await actionHandler?.({ type: 'create', shape: created });
              break;
            }

            //
            // Drag from other container.
            //
            case 'frame': {
              // data.shape.center = snapPoint(pos);
              // TODO(burdon): Copy from external canvas/component.
              if (!graph.getNode(data.shape.id)) {
                // graph.addNode({ id: shape.id, data: { ...shape } });
                log.info('copy', { shape: data.shape });
              }
              break;
            }

            //
            // Create link.
            // TODO(burdon): Callbacks to create and link (and determine if can drop).
            //
            case 'anchor': {
              const target = findDropTarget(
                location.current.dropTargets,
                (data) => data.type === 'frame' || data.type === 'anchor',
              );

              if (target) {
                switch (target?.type) {
                  case 'frame': {
                    await actionHandler?.({ type: 'link', source: data.shape.id, target: target.shape.id });
                    break;
                  }

                  case 'anchor': {
                    await actionHandler?.({
                      type: 'link',
                      source: data.shape.id,
                      target: target.shape.id,
                      data: { property: target.anchor },
                    });
                    break;
                  }
                }
              } else {
                const id = createId();
                const shape = createRectangle({ id, center: snapPoint(pos), size: itemSize });
                await actionHandler?.({ type: 'create', shape });
                await actionHandler?.({ type: 'link', source: data.shape.id, target: id });
              }

              break;
            }
          }
        }

        setOverlay(undefined);
      },

      // Dragging cancelled if user presses Esc.
      // https://atlassian.design/components/pragmatic-drag-and-drop/core-package/events#cancelling
      onDropTargetChange: ({ source, location }) => {
        cancelled.current = location.current.dropTargets.length === 0;
      },
    });
  }, [el, monitor, projection, actionHandler, selection, shape, snapPoint]);

  return { overlay };
};

const findDropTarget = (
  targets: DropTargetRecord[],
  match: (data: DragDropPayload) => boolean,
): DragDropPayload | undefined => {
  const target = targets.find(({ data }) => match(data as DragDropPayload));
  if (target) {
    return target.data as DragDropPayload;
  }
};
