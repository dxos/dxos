//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { type ElementDragPayload, monitorForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type PropsWithChildren, forwardRef, useCallback, useEffect, useRef, useState } from 'react';

import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { type MosaicData, type MosaicEventHandler, type MosaicTileData } from './types';

//
// Context
//

type MosaicDraggingSource = {
  data: MosaicTileData;
  handler?: MosaicEventHandler;
  container?: Element;
};

type MosaicDraggingTarget = {
  data: MosaicData;
  handler?: MosaicEventHandler;
};

type MosaicDraggingState = {
  source: MosaicDraggingSource;
  target?: MosaicDraggingTarget;
};

type MosaicRootContextValue = {
  containers: Record<string, MosaicEventHandler>;
  addContainer: (container: MosaicEventHandler) => void;
  removeContainer: (id: string) => void;
  dragging?: MosaicDraggingState;
};

const [MosaicRootContextProvider, useMosaicRootContext] = createContext<MosaicRootContextValue>('MosaicRoot');

//
// Root
//

const MOSAIC_ROOT_NAME = 'Mosaic.Root';

// State attribute: [&:has(>_[data-mosaic-debug=true])]
const MOSAIC_ROOT_DEBUG_ATTR = 'mosaic-debug';

type MosaicRootProps = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    debug?: boolean;
  }>
>;

const MosaicRoot = forwardRef<HTMLDivElement, MosaicRootProps>(
  ({ classNames, children, asChild, debug }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    const [handlers, setHandlers] = useState<Record<string, MosaicEventHandler>>({});
    const [dragging, setDragging] = useState<MosaicDraggingState | undefined>();

    const getSourceHandler = useCallback(
      (source: ElementDragPayload): { data: MosaicTileData; handler?: MosaicEventHandler } => {
        const data = source.data as MosaicTileData;
        return { data, handler: handlers[data.containerId] };
      },
      [handlers],
    );

    const getTargetHandler = useCallback(
      (location: DragLocationHistory): { data?: MosaicData; handler?: MosaicEventHandler } => {
        for (const target of location.current.dropTargets) {
          const data = target.data as MosaicData;
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
              // TOOD(burdon): Check id matches.
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
                if (sourceHandler === targetHandler) {
                  targetHandler.onDrop?.({
                    source: sourceData,
                    target: targetData,
                  });
                } else {
                  if (!sourceHandler.onTake) {
                    log.warn('invalid source', { source: sourceData });
                    return;
                  }

                  sourceHandler.onTake?.({ source: sourceData }, async (object) => {
                    targetHandler.onDrop?.({
                      source: { ...sourceData, data: object },
                      target: targetData,
                    });

                    return true;
                  });
                }
              }
            } finally {
              handleCancel();
            }
          },
        }),
      );
    }, [handlers, getSourceHandler, getTargetHandler]);

    return (
      <MosaicRootContextProvider
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
        <Root
          className={mx('group', classNames)}
          {...{
            [`data-${MOSAIC_ROOT_DEBUG_ATTR}`]: debug,
          }}
          ref={composedRef}
        >
          {children}
        </Root>
      </MosaicRootContextProvider>
    );
  },
);

MosaicRoot.displayName = MOSAIC_ROOT_NAME;

export { MosaicRoot, useMosaicRootContext };

export type { MosaicRootProps, MosaicDraggingState };
