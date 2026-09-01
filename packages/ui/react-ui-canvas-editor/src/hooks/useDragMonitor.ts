//
// Copyright 2024 DXOS.org
//

import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { useEffect } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type Dimension, type Point, useCanvasContext } from '@dxos/react-ui-canvas';

import { type Anchor, resizeAnchors } from '../components/index.ts';
import { getInputPoint, pointAdd, pointSubtract } from '../layout/index.ts';
import { createRectangle, parseAnchorId } from '../shapes/index.ts';
import { createId, itemSize } from '../testing/index.ts';
import { type CanvasGraphModel, type Polygon, isPolygon } from '../types/index.ts';
import { useEditorContext } from './useEditorContext.ts';
import { getClosestAnchor } from './useLayout.ts';
import { useSnap } from './useSnap.ts';

export const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/**
 * Repositions one edge of a centred extent, given the already-snapped position for that edge.
 * `dir` is -1 for the min edge, +1 for the max edge, and 0 to leave the axis untouched.
 * `symmetric` holds the centre and moves both edges together (shift-drag).
 *
 * Clamping to `min`/`max` takes precedence over the snap, so a size driven to a limit can leave the
 * edge off-grid unless the limits are themselves multiples of the grid pitch.
 */
export const resizeAxis = (
  center: number,
  size: number,
  dir: number,
  edge: number,
  { min, max, symmetric }: { min: number; max: number; symmetric: boolean },
): { center: number; size: number } => {
  if (dir === 0) {
    return { center, size };
  }
  if (symmetric) {
    return { center, size: clamp(Math.abs(edge - center) * 2, min, max) };
  }

  // The opposite edge is fixed, so the centre follows from it and the new size.
  const fixed = center - (dir * size) / 2;
  const next = clamp(Math.abs(edge - fixed), min, max);
  return { center: fixed + (dir * next) / 2, size: next };
};

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

  constructor(private readonly _registry: Registry.AtomRegistry) {}

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
            const anchor = resizeAnchors[state.anchor.id];

            // Snap the edge the anchor drags, in model space. Snapping the delta instead carries the
            // shape's existing off-grid remainder into the new size, so the dragged edge lands
            // between grid lines; and measuring the delta in screen px snaps to the wrong step as
            // soon as the projection is zoomed.
            const [initialPos, currentPos] = projection.toModel([
              getInputPoint(root, location.initial.input),
              getInputPoint(root, location.current.input),
            ]);
            const delta = pointSubtract(currentPos, initialPos);
            const edge = snapPoint({
              x: state.initial.x + (anchor.x * state.initial.width) / 2 + delta.x,
              y: state.initial.y + (anchor.y * state.initial.height) / 2 + delta.y,
            });

            const bounds = { min, max, symmetric: shiftKey };
            const x = resizeAxis(state.initial.x, state.initial.width, anchor.x, edge.x, bounds);
            const y = resizeAxis(state.initial.y, state.initial.height, anchor.y, edge.y, bounds);
            dragMonitor.update({
              shape: {
                ...state.shape,
                center: { x: x.center, y: y.center },
                size: { width: x.size, height: y.size },
              },
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
