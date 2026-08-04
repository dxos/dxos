//
// Copyright 2026 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { type ElementDragPayload, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';

import { log } from '@dxos/log';

import { type DndContainerHandler, type DndData, type DndTileData } from './types';

export type DndDraggingSource = {
  data: DndTileData;
  handler?: DndContainerHandler;
  container?: Element;
};

export type DndDraggingTarget = {
  data: DndData;
  handler?: DndContainerHandler;
};

export type DndDraggingState = {
  source: DndDraggingSource;
  target?: DndDraggingTarget;
};

export type DndSnapshot = {
  containers: Record<string, DndContainerHandler>;
  dragging?: DndDraggingState;
};

/**
 * Resolve a completed drop by routing it to the appropriate container handler(s).
 * Same handler: the target handles the drop directly (e.g., reorder within a container).
 * Different handlers: the source is asked to relinquish the object (`onTake`), and only once
 * it supplies the (possibly transformed) object does the target receive the drop.
 */
export const resolveDrop = (
  sourceHandler: DndContainerHandler | undefined,
  targetHandler: DndContainerHandler | undefined,
  source: DndTileData,
  target?: DndData,
): void => {
  if (!sourceHandler || !targetHandler) {
    return;
  }

  if (sourceHandler === targetHandler) {
    targetHandler.onDrop?.({ source, target });
  } else {
    if (!sourceHandler.onTake) {
      log.warn('invalid source', { source });
      return;
    }

    sourceHandler.onTake({ source }, async (object) => {
      targetHandler.onDrop?.({ source: { ...source, data: object }, target });
      return true;
    });
  }
};

/**
 * Framework-neutral drag-and-drop coordination: the container-handler registry, the live
 * dragging state, and the document-scoped pragmatic-dnd monitor. State lives here — outside
 * any React tree — so multiple React roots (e.g. detached surface roots) mounting their own
 * `Dnd.Root` against the same coordinator share one coordination domain and drags work
 * across root boundaries. `Dnd.Root` is a thin reactive binding over this class.
 */
export class DndCoordinator {
  #handlers: Record<string, DndContainerHandler> = {};
  #dragging: DndDraggingState | undefined;
  #snapshot: DndSnapshot = { containers: {} };
  #listeners = new Set<() => void>();
  #refCount = 0;
  #disposeMonitor: (() => void) | undefined;
  #noTargetTimeout: ReturnType<typeof setTimeout> | undefined;

  subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  getSnapshot = (): DndSnapshot => this.#snapshot;

  addContainer = (container: DndContainerHandler): void => {
    this.#handlers = { ...this.#handlers, [container.id]: container };
    this.#notify();
  };

  removeContainer = (id: string): void => {
    const { [id]: _removed, ...rest } = this.#handlers;
    this.#handlers = rest;
    this.#notify();
  };

  /**
   * Ref-counted monitor lifecycle: the first acquire attaches the document-scoped monitor,
   * the last release detaches it. Returns the matching release.
   */
  acquire = (): (() => void) => {
    if (this.#refCount++ === 0) {
      this.#disposeMonitor = this.#attachMonitor();
    }
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      if (--this.#refCount === 0) {
        this.#disposeMonitor?.();
        this.#disposeMonitor = undefined;
      }
    };
  };

  #notify(): void {
    this.#snapshot = { containers: this.#handlers, dragging: this.#dragging };
    for (const listener of this.#listeners) {
      listener();
    }
  }

  #setDragging(dragging: DndDraggingState | undefined): void {
    this.#dragging = dragging;
    this.#notify();
  }

  #getSourceHandler(source: ElementDragPayload): { data: DndTileData; handler?: DndContainerHandler } {
    const data = source.data as DndTileData;
    return { data, handler: this.#handlers[data.containerId] };
  }

  #getTargetHandler(location: DragLocationHistory): { data?: DndData; handler?: DndContainerHandler } {
    for (const target of location.current.dropTargets) {
      const data = target.data as DndData;
      let containerId: string;
      switch (data.type) {
        case 'tile':
        case 'placeholder':
          containerId = data.containerId;
          break;
        case 'container':
          containerId = data.id;
          break;
      }

      const handler = this.#handlers[containerId];
      if (handler) {
        return { data, handler };
      }
    }

    return {};
  }

  #handleChange(source: ElementDragPayload, location: DragLocationHistory): void {
    const { data: sourceData } = this.#getSourceHandler(source);
    const { data: targetData, handler } = this.#getTargetHandler(location);
    this.#dragging?.target?.handler?.onCancel?.();
    this.#setDragging({
      source: {
        data: sourceData,
        handler: this.#handlers[sourceData.containerId],
        // TODO(burdon): Check id matches.
        container: location.initial.dropTargets.find((target) => target.data.type === 'container')?.element,
      },
      target: targetData && {
        data: targetData,
        handler,
      },
    });
  }

  #handleCancel(): void {
    const dragging = this.#dragging;
    requestAnimationFrame(() => {
      dragging?.target?.handler?.onCancel?.();
      dragging?.source?.container?.dispatchEvent(new CustomEvent('dnd:cancel', { bubbles: true }));
    });
    this.#setDragging(undefined);
  }

  #attachMonitor(): () => void {
    return combine(
      monitorForElements({
        // Only monitor Dnd tile drags; other pragmatic-dnd sources are not ours to handle.
        canMonitor: ({ source }) => source.data.type === 'tile',
        /**
         * Dragging started within any container.
         */
        onDragStart: ({ source, location }) => {
          log('Root.onDragStart', {
            source: source.data,
            location: location.current.dropTargets.map((target) => target.data),
          });

          this.#handleChange(source, location);
        },

        /**
         * Dragging entered a new container.
         */
        onDropTargetChange: ({ source, location }) => {
          clearTimeout(this.#noTargetTimeout);
          log('Root.onDropTargetChange', {
            source: source.data,
            location: location.current.dropTargets.map((target) => target.data),
          });

          // Stop dragging if there are no drop targets (or we are cancelling).
          if (location.current.dropTargets.length === 0) {
            this.#noTargetTimeout = setTimeout(() => this.#setDragging(undefined), 1_000);
          } else {
            this.#handleChange(source, location);
          }
        },

        /**
         * Dragging within any container.
         */
        onDrag: ({ source, location }) => {
          const { data } = this.#getSourceHandler(source);
          const { handler } = this.#getTargetHandler(location);
          if (handler) {
            const { clientX: x, clientY: y } = location.current.input;
            handler.onDrag?.({ source: data, position: { x, y } });
          }
        },

        /**
         * Dragging ended.
         */
        onDrop: ({ source, location }) => {
          log.info('Root.onDrop', {
            source: source.data,
            location: location.current.dropTargets.map((target) => target.data),
          });

          // Get the source container.
          const { data: sourceData, handler: sourceHandler } = this.#getSourceHandler(source);
          if (!sourceHandler) {
            log.warn('invalid source', {
              source: sourceData,
              handlers: Object.keys(this.#handlers),
            });
            return;
          }

          // NOTE: When dragging is cancelled (e.g., user presses ESC) onDrop is only called after a subsequent event.
          // NOTE: pDND blocks ESC event propagation while dragging.
          // - ESC only flips internal state.
          // - Completion happens on the next processed input event.
          // - This avoids reentrancy and keeps pointer/keyboard behavior consistent.
          // - We set dragging to undefined in onDropTargetChange after a delay if there are no drop targets.
          try {
            if (location.current.dropTargets.length === 0) {
              log.info('cancelled');
            } else {
              // Get the target container.
              const { data: targetData, handler: targetHandler } = this.#getTargetHandler(location);
              if (!targetHandler) {
                log.warn('invalid target', {
                  source: sourceData,
                  location,
                  handlers: Object.keys(this.#handlers),
                });
                return;
              }

              // TODO(burdon): Check object doesn't already exist in the collection.
              resolveDrop(sourceHandler, targetHandler, sourceData, targetData);
            }
          } finally {
            this.#handleCancel();
          }
        },
      }),
    );
  }
}

let defaultCoordinator: DndCoordinator | undefined;

/**
 * The shared default coordination domain. Every `Dnd.Root` without an explicit `coordinator`
 * prop binds here, so independently-mounted roots coordinate drags with each other.
 */
export const getDefaultDndCoordinator = (): DndCoordinator => (defaultCoordinator ??= new DndCoordinator());
