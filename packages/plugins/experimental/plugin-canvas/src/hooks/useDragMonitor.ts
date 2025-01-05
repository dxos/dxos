//
// Copyright 2024 DXOS.org
//

import { type Point } from '@antv/layout';
import { monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type Signal, signal } from '@preact/signals-core';
import { useEffect } from 'react';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { useProjection } from '@dxos/react-ui-canvas';

import { useEditorContext } from './useEditorContext';
import { getClosestAnchor } from './useLayout';
import { useSnap } from './useSnap';
import { type Anchor } from '../components';
import { getInputPoint, pointAdd, pointRound } from '../layout';
import { createRectangle, parseAnchorId } from '../shapes';
import { createId, itemSize } from '../testing';
import { type Polygon } from '../types';

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
      // TODO(burdon): Remove (see frame handling).
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
      /** Snap target. */
      target?: DragDropPayload;
      /** Current pointer. */
      pointer?: Point;
    };

/**
 * Extensible controller.
 * Manages reactive dragging state.
 */
export class DragMonitor {
  _instance = 'DragMonitor-' + String(Math.random()).slice(2, 6); // TODO(burdon): ???
  private readonly _state: Signal<DraggingState> = signal<DraggingState>({ type: 'inactive' });
  private _offset?: Point;

  get dragging() {
    return this._state.value.type !== 'inactive';
  }

  get offset(): Point {
    invariant(this._offset);
    return this._offset;
  }

  /**
   * Returns the state if the test matches.
   */
  state(test?: (state: DraggingState) => boolean): Signal<DraggingState> {
    return !test || test(this._state.value) ? this._state : signal<DraggingState>({ type: 'inactive' });
  }

  /**
   * Offset relative to the center of the shape.
   */
  setOffset(offset: Point) {
    this._offset = offset;
  }

  /**
   * Called from setCustomNativeDragPreview.render()
   */
  start(state: DraggingState) {
    log.info('start', { id: this._instance, state });
    this._state.value = state;
  }

  /**
   * Called while dragging.
   */
  update(state: Partial<DraggingState>) {
    this._state.value = { ...this._state.value, ...state } as any;
  }

  /**
   * Called on drop.
   */
  stop() {
    log.info('stop', { id: this._instance });
    this._state.value = { type: 'inactive' };
    this._offset = undefined;
  }

  // TODO(burdon): Pluggable callbacks. Move logic from drag handler below.

  /**
   * Called by dropTargetForElements.canDrop(DropTargetGetFeedbackArgs)
   */
  canDrop(target: DragDropPayload): boolean {
    const { type } = this._state.value;
    if (type) {
      switch (target.type) {
        case 'frame': {
          // TODO(burdon): Type specific.
          return target.shape.type === 'rectangle';
        }

        case 'anchor': {
          if (this._state.value.type === 'anchor' && target.shape.id !== this._state.value.anchor.shape) {
            // TODO(burdon): Test types match.
            // TODO(burdon): Prevent drop if anchor is already populated.
            const source = this._state.value;
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
  const { graph, selection, dragMonitor, registry, actionHandler } = useEditorContext();
  const { root, projection } = useProjection();
  const snapPoint = useSnap();

  const state = dragMonitor.state();

  useEffect(() => {
    if (!actionHandler) {
      return;
    }

    return monitorForElements({
      //
      // Drag
      //
      onDrag: async ({ location }) => {
        invariant(dragMonitor.dragging, `Monitor not dragging: ${dragMonitor._instance}`);
        const [pos] = projection.toModel([getInputPoint(root, location.current.input)]);

        switch (state.value.type) {
          case 'frame': {
            dragMonitor.update({
              shape: { ...state.value.shape, center: pointRound(pointAdd(pos, dragMonitor.offset)) },
            });
            break;
          }

          case 'anchor': {
            // Snap to closest anchor.
            // TODO(burdon): Update layout to use anchor.
            const target = getClosestAnchor(graph, registry, pos, (shape, anchor, d) => {
              return d < 32 && dragMonitor.canDrop({ type: 'anchor', shape, anchor });
            });

            dragMonitor.update({ target, pointer: target?.anchor.pos ?? pos });
            break;
          }
        }
      },

      //
      // Drop
      //
      onDrop: async ({ location }) => {
        invariant(dragMonitor.dragging);
        const [pos] = projection.toModel([getInputPoint(root, location.current.input)]);

        switch (state.value.type) {
          //
          // Create shape from tool.
          //
          case 'tool': {
            const shape = state.value.shape;
            shape.center = snapPoint(pos);
            await actionHandler({ type: 'create', shape });
            break;
          }

          //
          // Move.
          //
          case 'frame': {
            const node = graph.getNode(state.value.shape.id);
            if (!node) {
              // TODO(burdon): Copy from external canvas/component.
              // graph.addNode({ id: shape.id, data: { ...shape } });
              log.info('copy', { shape: state.value.shape });
            } else {
              node.data.center = snapPoint(pointRound(pointAdd(pos, dragMonitor.offset)));
            }

            break;
          }

          //
          // Create link.
          //
          case 'anchor': {
            const source = state.value;
            const target = state.value.target ?? (location.current.dropTargets?.[0]?.data as DragDropPayload);

            switch (target?.type) {
              case 'frame': {
                await actionHandler({ type: 'link', source: source.shape.id, target: target.shape.id });
                break;
              }

              case 'anchor': {
                // TODO(burdon): Custom logic.
                const [sourceDirection, sourceAnchorId] = parseAnchorId(source.anchor.id);
                const [, targetAnchorId] = parseAnchorId(target.anchor.id);
                if (sourceDirection === 'output') {
                  await actionHandler({
                    type: 'link',
                    source: source.shape.id,
                    target: target.shape.id,
                    connection: { input: targetAnchorId, output: sourceAnchorId },
                  });
                } else {
                  await actionHandler({
                    type: 'link',
                    source: target.shape.id,
                    target: source.shape.id,
                    connection: { input: sourceAnchorId, output: targetAnchorId },
                  });
                }
                break;
              }

              case 'canvas': {
                // TODO(burdon): Popup selector.
                if (source.shape.type !== 'function') {
                  const shape = createRectangle({ id: createId(), center: pos, size: itemSize });
                  await actionHandler({ type: 'create', shape });
                  await actionHandler({ type: 'link', source: source.shape.id, target: shape.id });
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
