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
import { useEffect } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Point, useProjection } from '@dxos/react-ui-canvas';

import { useEditorContext } from './useEditorContext';
import { useSnap } from './useSnap';
import { getInputPoint } from '../layout';
import { createRectangle } from '../shapes';
import { createId, itemSize } from '../testing';
import { type Polygon } from '../types';

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
      shape: Polygon;
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
  anchor?: string;
  pos?: Point;
};

const INACTIVE = signal<DraggingState>({});

/**
 * Extensible controller.
 * Manages reactive dragging state.
 */
// TODO(burdon): Handle cancellation.
export class DragMonitor {
  private _state: Signal<DraggingState> = signal<DraggingState>({});

  get dragging(): Signal<DraggingState> {
    return this._state;
  }

  /**
   * Returns the state if the test matches.
   */
  state(test?: (state: DraggingState) => boolean): Signal<DraggingState> {
    return !test || test(this._state.value) ? this._state : INACTIVE;
  }

  /**
   * Called from setCustomNativeDragPreview.render()
   */
  preview(state: DraggingState) {
    this._state.value = state;
  }

  /**
   * Called from draggable.onDrag()
   */
  drag(state: Omit<DraggingState, 'container'>) {
    this._state.value = { ...this._state.value, ...state };
  }

  /**
   * Called from draggable.onDrop()
   */
  drop() {
    this._state.value = {};
  }

  // TODO(burdon): Pluggable callbacks.

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
 * Components manager their own previews and dragging state; this hook performs actions on drop.
 */
export const useDragMonitor = () => {
  const { graph, selection, monitor, actionHandler } = useEditorContext();
  const { root, projection } = useProjection();
  const snapPoint = useSnap();

  useEffect(() => {
    return monitorForElements({
      onDrop: async ({ source, location }) => {
        if (!monitor.state() || !location.current.dropTargets.length) {
          return;
        }

        invariant(root);
        const [pos] = projection.toModel([getInputPoint(root, location.current.input)]);
        const data = source.data as DragDropPayload;
        switch (data.type) {
          //
          // Create shape from tool.
          //
          case 'tool': {
            const shape = data.shape;
            shape.center = snapPoint(pos);
            await actionHandler?.({ type: 'create', shape });
            break;
          }

          //
          // Drag from other container.
          //
          case 'frame': {
            // TODO(burdon): Copy from external canvas/component.
            if (!graph.getNode(data.shape.id)) {
              // graph.addNode({ id: shape.id, data: { ...shape } });
              log.info('copy', { shape: data.shape });
            }
            break;
          }

          //
          // Create link.
          //
          case 'anchor': {
            const target = findDropTarget(
              location.current.dropTargets,
              ({ type }) => type === 'frame' || type === 'anchor',
            );

            // Check link to existing.
            if (target) {
              switch (target?.type) {
                case 'frame': {
                  await actionHandler?.({ type: 'link', source: data.shape.id, target: target.shape.id });
                  break;
                }

                case 'anchor': {
                  if (data.anchor) {
                    // TODO(burdon): Unlink existing.
                    if (data.anchor === '#output') {
                      await actionHandler?.({
                        type: 'link',
                        source: data.shape.id,
                        target: target.shape.id,
                        data: { property: target.anchor },
                      });
                    } else {
                      await actionHandler?.({
                        type: 'link',
                        source: target.shape.id,
                        target: data.shape.id,
                        data: { property: data.anchor },
                      });
                    }
                  } else {
                    await actionHandler?.({
                      type: 'link',
                      source: data.shape.id,
                      target: target.shape.id,
                    });
                  }
                  break;
                }
              }
            } else {
              if (data.shape.type !== 'function') {
                // New object.
                const id = createId();
                const shape = createRectangle({ id, center: snapPoint(pos), size: itemSize });
                await actionHandler?.({ type: 'create', shape });
                await actionHandler?.({ type: 'link', source: data.shape.id, target: id });
              }
            }

            break;
          }
        }
      },
    });
  }, [root, monitor, projection, actionHandler, selection, snapPoint]);
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
