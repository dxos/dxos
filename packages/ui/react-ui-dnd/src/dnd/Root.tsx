//
// Copyright 2026 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { type ElementDragPayload, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useState } from 'react';

import { log } from '@dxos/log';

import { type DndContainerHandler, type DndData, type DndTileData } from './types';

//
// Context
//

type DndDraggingSource = {
  data: DndTileData;
  handler?: DndContainerHandler;
  container?: Element;
};

type DndDraggingTarget = {
  data: DndData;
  handler?: DndContainerHandler;
};

type DndDraggingState = {
  source: DndDraggingSource;
  target?: DndDraggingTarget;
};

type DndRootContextValue = {
  containers: Record<string, DndContainerHandler>;
  addContainer: (container: DndContainerHandler) => void;
  removeContainer: (id: string) => void;
  dragging?: DndDraggingState;
};

const [DndRootContextProvider, useDndRootContext] = createContext<DndRootContextValue>('DndRoot');

//
// Root
//

const DND_ROOT_NAME = 'Dnd.Root';

type DndRootProps = PropsWithChildren;

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
 * Headless: provides drag-and-drop orchestration and context only, renders no DOM of its own.
 * Consumers wrap the visible chrome they control (typically via `Dnd.Container`).
 */
const DndRoot = ({ children }: DndRootProps) => {
  const [handlers, setHandlers] = useState<Record<string, DndContainerHandler>>({});
  const [dragging, setDragging] = useState<DndDraggingState | undefined>();

  const getSourceHandler = useCallback(
    (source: ElementDragPayload): { data: DndTileData; handler?: DndContainerHandler } => {
      const data = source.data as DndTileData;
      return { data, handler: handlers[data.containerId] };
    },
    [handlers],
  );

  const getTargetHandler = useCallback(
    (location: DragLocationHistory): { data?: DndData; handler?: DndContainerHandler } => {
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

        const handler = handlers[containerId];
        if (handler) {
          return { data, handler };
        }
      }

      return {};
    },
    [handlers],
  );

  useEffect(() => {
    const handleChange = ({ source, location }: { source: ElementDragPayload; location: DragLocationHistory }) => {
      const { data: sourceData } = getSourceHandler(source);
      const { data: targetData, handler } = getTargetHandler(location);
      setDragging((dragging) => {
        dragging?.target?.handler?.onCancel?.();
        return {
          source: {
            data: sourceData,
            handler: handlers[sourceData.containerId],
            // TODO(burdon): Check id matches.
            container: location.initial.dropTargets.find((target) => target.data.type === 'container')?.element,
          },
          target: targetData && {
            data: targetData,
            handler,
          },
        };
      });
    };

    const handleCancel = () => {
      setDragging((dragging) => {
        requestAnimationFrame(() => {
          dragging?.target?.handler?.onCancel?.();
          dragging?.source?.container?.dispatchEvent(new CustomEvent('dnd:cancel', { bubbles: true }));
        });

        return undefined;
      });
    };

    let noTargetTimeout: NodeJS.Timeout;

    // Main controller.
    return combine(
      monitorForElements({
        // Only monitor Dnd tile drags; other pragmatic-dnd sources under this root are not ours to handle.
        canMonitor: ({ source }) => source.data.type === 'tile',
        /**
         * Dragging started within any container.
         */
        onDragStart: ({ source, location }) => {
          log('Root.onDragStart', {
            source: source.data,
            location: location.current.dropTargets.map((target) => target.data),
          });

          handleChange({ source, location });
        },

        /**
         * Dragging entered a new container.
         */
        onDropTargetChange: ({ source, location }) => {
          clearTimeout(noTargetTimeout);
          log('Root.onDropTargetChange', {
            source: source.data,
            location: location.current.dropTargets.map((target) => target.data),
          });

          // Stop dragging if there are no drop targets (or we are cancelling).
          if (location.current.dropTargets.length === 0) {
            noTargetTimeout = setTimeout(() => setDragging(undefined), 1_000);
          } else {
            handleChange({ source, location });
          }
        },

        /**
         * Dragging within any container.
         */
        onDrag: ({ source, location }) => {
          const { data } = getSourceHandler(source);
          const { handler } = getTargetHandler(location);
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
          const { data: sourceData, handler: sourceHandler } = getSourceHandler(source);
          if (!sourceHandler) {
            log.warn('invalid source', {
              source: sourceData,
              handlers: Object.keys(handlers),
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
              const { data: targetData, handler: targetHandler } = getTargetHandler(location);
              if (!targetHandler) {
                log.warn('invalid target', {
                  source: sourceData,
                  location,
                  handlers: Object.keys(handlers),
                });
                return;
              }

              // TODO(burdon): Check object doesn't already exist in the collection.
              resolveDrop(sourceHandler, targetHandler, sourceData, targetData);
            }
          } finally {
            handleCancel();
          }
        },
      }),
    );
  }, [handlers, getSourceHandler, getTargetHandler]);

  return (
    <DndRootContextProvider
      containers={handlers}
      addContainer={(container) =>
        setHandlers((containers) => ({
          ...containers,
          [container.id]: container,
        }))
      }
      removeContainer={(id) =>
        setHandlers((containers) => {
          delete containers[id];
          return { ...containers };
        })
      }
      dragging={dragging}
    >
      {children}
    </DndRootContextProvider>
  );
};

DndRoot.displayName = DND_ROOT_NAME;

export const Dnd = { Root: DndRoot };

export { useDndRootContext };

export type { DndDraggingState, DndRootContextValue, DndRootProps };
