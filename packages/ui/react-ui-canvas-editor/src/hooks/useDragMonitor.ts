//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { Atom, type Registry } from '@effect-atom/atom-react';
import { useEffect } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Dimension, type Point, useCanvasContext } from '@dxos/react-ui-canvas';

import { type Anchor, resizeAnchors } from '../components';
import { getInputPoint, pointAdd, pointSubtract } from '../layout';
import { createRectangle, parseAnchorId } from '../shapes';
import { createId, itemSize } from '../testing';
import { type CanvasGraphModel, type Polygon, isPolygon } from '../types';

import { useEditorContext } from './useEditorContext';
import { getClosestAnchor } from './useLayout';
import { useSnap } from './useSnap';

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Data property associated with a `draggable` and `dropTargetForElements`.
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
      anchor: Anchor;
    };

/**
 * Active dragging state.
 */
export type DraggingState =
  | {
      type: 'inactive';
    }
  | {
      type: 'tool';
      shape: Polygon;
      container: HTMLElement;
    }
  | {
      type: 'frame';
      shape: Polygon;
    }
  | {
      type: 'anchor';
      shape: Polygon;
      anchor: Anchor;
      pointer?: Point;
      snapTarget?: DragDropPayload;
    }
  | {
      type: 'resize';
      shape: Polygon;
      anchor: Anchor;
      pointer?: Point;
      initial: Point & Dimension;
    };

/**
 * Extensible controller.
 * Manages reactive dragging state.
 */
export class DragMonitor {
  private readonly _state = Atom.make<DraggingState>({ type: 'inactive' });
  private _offset?: Point;

  constructor(private readonly _registry: Registry.Registry) {}

  get dragging() {
    return this._registry.get(this._state).type !== 'inactive';
  }

  get offset(): Point {
    return this._offset ?? { x: 0, y: 0 };
  }

  /**
   * Returns the state atom for reactive reads.
   */
  get state(): Atom.Atom<DraggingState> {
    return this._state;
  }

  /**
   * Returns the current state value.
   */
  getState(): DraggingState {
    return this._registry.get(this._state);
  }

  /**
   * Offset relative to the center of the shape.
   */
  setOffset(offset: Point): void {
    this._offset = offset;
  }

  /**
   * Called from setCustomNativeDragPreview.render()
   */
  start(state: DraggingState): void {
    this._registry.set(this._state, state);
  }

  /**
   * Called while dragging.
   */
  update(state: Partial<DraggingState>): void {
    this._registry.set(this._state, { ...this._registry.get(this._state), ...state } as DraggingState);
  }

  /**
   * Called on drop.
   */
  stop(): void {
    this._registry.set(this._state, { type: 'inactive' });
    this._offset = undefined;
  }

  // TODO(burdon): Pluggable callbacks. Move logic from drag handler below.

  /**
   * Called by dropTargetForElements.canDrop(DropTargetGetFeedbackArgs)
   */
  canDrop(target: DragDropPayload): boolean {
    const state = this._registry.get(this._state);
    const { type } = state;
    if (type) {
      switch (target.type) {
        case 'frame': {
          // TODO(burdon): Type specific.
          return target.shape.type === 'rectangle';
        }

        case 'anchor': {
          if (state.type === 'anchor' && target.shape.id !== state.anchor.shape) {
            // TODO(burdon): Test types match.
            // TODO(burdon): Prevent drop if anchor is already populated.
            const source = state;
            const [sourceDirection] = parseAnchorId(source.anchor.id);
            const [targetDirection] = parseAnchorId(target.anchor.id);
            if (sourceDirection !== targetDirection) {
              return true;
            }
          }
          break;
        }
      }
    }

    return false;
  }
}

/**
 * Monitor frames and anchors being dragged.
 * Components manager their own previews and dragging state; this hook performs actions on drop.
 */
// TODO(burdon): Handle cancellation.
// TODO(burdon): Handle cursor dragging out of window (currently drop is lost/frozen).
export const useDragMonitor = () => {
  const { graph, selection, dragMonitor, layout, actionHandler } = useEditorContext();
  const { root, projection } = useCanvasContext();
  const snapPoint = useSnap();

  useEffect(() => {
    if (!actionHandler) {
      return;
    }

    return monitorForElements({
      //
      // Drag
      //
      onDrag: async ({ location }) => {
        if (!dragMonitor.dragging) {
          return;
        }

        const [pos] = projection.toModel([getInputPoint(root, location.current.input)]);
        const shiftKey = location.current.input.shiftKey;
        const state = dragMonitor.getState();

        switch (state.type) {
          case 'frame': {
            dragMonitor.update({
              shape: { ...state.shape, center: pointAdd(pos, dragMonitor.offset) },
            });
            break;
          }

          case 'resize': {
            // TODO(burdon): Default sizes.
            const min = 128;
            const max = 960;
            const delta = pointSubtract(
              getInputPoint(root, location.current.input),
              getInputPoint(root, location.initial.input),
            );
            const anchor = resizeAnchors[state.anchor.id];
            let { x: dx, y: dy } = snapPoint({
              x: delta.x * anchor.x * (shiftKey ? 2 : 1),
              y: delta.y * anchor.y * (shiftKey ? 2 : 1),
            });
            if (state.initial.width + dx < min) {
              dx = min - state.initial.width;
            } else if (state.initial.width + dx > max) {
              dx = max - state.initial.width;
            }
            if (state.initial.height + dy < min) {
              dy = min - state.initial.height;
            } else if (state.initial.height + dy > max) {
              dy = max - state.initial.height;
            }

            const center = shiftKey
              ? state.initial
              : {
                  x: state.initial.x + (dx / 2) * (anchor.x < 0 ? -1 : 1),
                  y: state.initial.y + (dy / 2) * (anchor.y < 0 ? -1 : 1),
                };
            const size = {
              width: state.initial.width + dx,
              height: state.initial.height + dy,
            };
            dragMonitor.update({
              shape: { ...state.shape, center, size },
            });
            break;
          }

          case 'anchor': {
            // Snap to closest anchor.
            const target = getClosestAnchor(layout, graph as CanvasGraphModel<Polygon>, pos, (shape, anchor, d) => {
              return d < 32 && dragMonitor.canDrop({ type: 'anchor', shape, anchor });
            });
            dragMonitor.update({
              pointer: target?.anchor.pos ?? pos,
              snapTarget: target,
            });
            break;
          }
        }
      },

      //
      // Drop
      //
      onDrop: async ({ location }) => {
        if (!dragMonitor.dragging) {
          return;
        }

        const [pos] = projection.toModel([getInputPoint(root, location.current.input)]);
        const state = dragMonitor.getState();

        switch (state.type) {
          //
          // Create shape from tool.
          //
          case 'tool': {
            const shape = state.shape;
            shape.center = snapPoint(pos);
            await actionHandler({ type: 'create', shape });
            break;
          }

          //
          // Move.
          //
          case 'frame': {
            const node = graph.getNode(state.shape.id);
            if (!node) {
              // TODO(burdon): Copy from external canvas/component.
              // graph.addNode(shape);
              log.info('copy', { shape: state.shape });
            } else {
              invariant(isPolygon(node));
              node.center = snapPoint(pointAdd(pos, dragMonitor.offset));
            }
            break;
          }

          //
          // Resize
          //
          case 'resize': {
            const node = graph.getNode(state.shape.id);
            if (node) {
              invariant(isPolygon(node));
              node.center = state.shape.center;
              node.size = state.shape.size;
            }
            break;
          }

          //
          // Create link.
          //
          case 'anchor': {
            const source = state;
            const target = state.snapTarget ?? (location.current.dropTargets?.[0]?.data as DragDropPayload);

            switch (target?.type) {
              case 'frame': {
                if (source.shape.type === 'rectangle') {
                  await actionHandler({
                    type: 'link',
                    connection: { source: source.shape.id, target: target.shape.id },
                  });
                }
                break;
              }

              case 'anchor': {
                // TODO(burdon): Custom logic.
                const [sourceDirection, sourceAnchorId] = parseAnchorId(source.anchor.id);
                const [, targetAnchorId] = parseAnchorId(target.anchor.id);
                if (sourceDirection === 'output') {
                  await actionHandler({
                    type: 'link',
                    connection: {
                      source: source.shape.id,
                      target: target.shape.id,
                      output: sourceAnchorId,
                      input: targetAnchorId,
                    },
                  });
                } else {
                  await actionHandler({
                    type: 'link',
                    connection: {
                      source: target.shape.id,
                      target: source.shape.id,
                      output: targetAnchorId,
                      input: sourceAnchorId,
                    },
                  });
                }
                break;
              }

              case 'canvas': {
                // TODO(burdon): Popup selector.
                if (source.shape.type === 'rectangle') {
                  const shape = createRectangle({ id: createId(), center: pos, size: itemSize });
                  await actionHandler({ type: 'create', shape });
                  await actionHandler({
                    type: 'link',
                    connection: { source: source.shape.id, target: shape.id },
                  });
                  await actionHandler({ type: 'select', ids: [shape.id] });
                }
                break;
              }
            }
            break;
          }
        }

        dragMonitor.stop();
      },
    });
  }, [root, dragMonitor, projection, actionHandler, selection, snapPoint]);
};
