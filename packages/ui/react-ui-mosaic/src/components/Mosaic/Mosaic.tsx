//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  type ElementDragPayload,
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { DropIndicator } from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { composeRefs, useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, {
  type CSSProperties,
  type PropsWithChildren,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { type Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import {
  type MosaicCellData,
  type MosaicContainerData,
  type MosaicData,
  type MosaicEventHandler,
  type MosaicPlaceholderData,
} from './types';

//
// Context
//

type MosaicDraggingState = {
  source: MosaicCellData;
  target?: MosaicData;
};

type MosaicContextValue = {
  containers: Record<string, MosaicEventHandler>;
  dragging?: MosaicDraggingState;
  setDragging: (dragging: MosaicDraggingState | undefined) => void;
  addContainer: (container: MosaicEventHandler) => void;
  removeContainer: (id: string) => void;
};

const [MosaicContextProvider, useMosaicContext] = createContext<MosaicContextValue>('Mosaic');

//
// Root
//

type RootProps = PropsWithChildren;

const Root = ({ children }: RootProps) => {
  const [handlers, setHandlers] = useState<Record<string, MosaicEventHandler>>({});
  const [dragging, setDragging] = useState<MosaicDraggingState | undefined>();
  const currentHandler = useRef<MosaicEventHandler>(undefined);

  const getSourceHandler = (source: ElementDragPayload): { data: MosaicCellData; handler?: MosaicEventHandler } => {
    const data = source.data as MosaicCellData;
    return { data, handler: handlers[data.containerId] };
  };

  const getTargetHandler = (location: DragLocationHistory): { data?: MosaicData; handler?: MosaicEventHandler } => {
    for (const target of location.current.dropTargets) {
      const data = target.data as MosaicData;
      let containerId: string;
      switch (data.type) {
        case 'cell':
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

    return { data: undefined, handler: undefined };
  };

  useEffect(() => {
    return monitorForElements({
      onDrag: ({ source, location }) => {
        const { data } = getSourceHandler(source);
        const { handler } = getTargetHandler(location);
        if (handler) {
          const { clientX: x, clientY: y } = location.current.input;
          handler.onDrag?.({ source: data, position: { x, y } });
        }
      },
      onDropTargetChange: ({ location }) => {
        const { handler } = getTargetHandler(location);
        currentHandler.current?.onCancel?.();
        currentHandler.current = handler;
      },
      onDrop: ({ source, location }) => {
        log('onDrop', {
          source: source.data,
          location: location.current.dropTargets.map((target) => target.data),
        });

        try {
          // Get the source container.
          const { data: sourceData, handler: sourceHandler } = getSourceHandler(source);
          if (!sourceHandler) {
            log.warn('invalid source', { source: sourceData, handlers: Object.keys(handlers) });
            return;
          }

          // Get the target container.
          const { data: targetData, handler: targetHandler } = getTargetHandler(location);
          if (!targetHandler) {
            log.warn('invalid target', { source: sourceData, location, handlers: Object.keys(handlers) });
            return;
          }

          // TODO(burdon): Check doesn't already exist in collection.
          if (sourceHandler === targetHandler) {
            targetHandler.onDrop?.({ source: sourceData, target: targetData });
          } else {
            if (!sourceHandler.onTake) {
              log.warn('invalid source', { source: sourceData });
              return;
            }

            sourceHandler.onTake?.({ source: sourceData }, async (object) => {
              targetHandler.onDrop?.({ source: { ...sourceData, object }, target: targetData });
              return true;
            });
          }
        } finally {
          currentHandler.current?.onCancel?.();
          currentHandler.current = undefined;
        }
      },
    });
  }, [handlers]);

  return (
    <MosaicContextProvider
      containers={handlers}
      dragging={dragging}
      setDragging={setDragging}
      addContainer={(container) => setHandlers((containers) => ({ ...containers, [container.id]: container }))}
      removeContainer={(id) =>
        setHandlers((containers) => {
          delete containers[id];
          return { ...containers };
        })
      }
    >
      {children}
    </MosaicContextProvider>
  );
};

//
// Container
//

type MosaicContainerContextValue = {
  id: string;
  dragging?: MosaicDraggingState;
};

const [MosaicContainerContextProvider, useMosaicContainerContext] =
  createContext<MosaicContainerContextValue>('MosaicContainer');

/**
 * Target: [&:has(>_[data-mosaic-container-state=active])]
 */
const MOSAIC_CONTAINER_STATE_ATTR = 'mosaic-container-state';

type ContainerState = { type: 'idle' } | { type: 'active' };

type ContainerProps = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    autoscroll?: boolean;
    handler: MosaicEventHandler;
  }>
>;

/**
 * Ref https://www.radix-ui.com/primitives/docs/guides/composition
 * NOTE: Children must forwardRef and spread props to root element.
 */
const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ classNames, children, asChild, autoscroll, handler }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    const { setDragging: setRootDragging } = useMosaicContext(Container.displayName!);
    const [dragging, setLocalDragging] = useState<MosaicDraggingState | undefined>();
    const setDragging = useCallback(
      (dragging: MosaicDraggingState | undefined) => {
        setLocalDragging(dragging);
        setRootDragging(dragging);
      },
      [setLocalDragging, setRootDragging],
    );

    const { addContainer, removeContainer } = useMosaicContext(handler.id);
    useEffect(() => {
      addContainer(handler);
      return () => removeContainer(handler.id);
    }, [handler]);

    const [state, setState] = useState<ContainerState>({ type: 'idle' });
    useEffect(() => {
      if (!rootRef.current) {
        return;
      }

      return combine(
        ...[
          dropTargetForElements({
            element: rootRef.current,
            getData: () => {
              return {
                type: 'container',
                id: handler.id,
              } satisfies MosaicContainerData;
            },
            canDrop: ({ source }) => {
              return (
                (source.data.type === 'cell' && handler.canDrop?.({ source: source.data as MosaicCellData })) || false
              );
            },
            onDragStart: ({ source }) => {
              setState({ type: 'active' });
              setDragging({ source: source.data as MosaicCellData });
            },
            onDragEnter: () => {
              setState({ type: 'active' });
            },
            onDrag: ({ source, location }) => {
              setDragging({
                source: source.data as MosaicCellData,
                // TODO(burdon): Use util.
                target: location.current.dropTargets[0]?.data as MosaicData,
              });
            },
            onDragLeave: () => {
              setState({ type: 'idle' });
            },
            onDrop: () => {
              setState({ type: 'idle' });
              setDragging(undefined);
            },
          }),
          autoscroll &&
            autoScrollForElements({
              element: rootRef.current,
            }),
        ].filter(isTruthy),
      );
    }, [rootRef, handler]);

    return (
      <MosaicContainerContextProvider id={handler.id} dragging={dragging}>
        <Root
          {...{ [`data-${MOSAIC_CONTAINER_STATE_ATTR}`]: state.type }}
          role='none'
          className={mx(classNames)}
          ref={composedRef}
        >
          {children}
        </Root>
      </MosaicContainerContextProvider>
    );
  },
);

Container.displayName = 'MosaicContainer';

//
// Cell
//

/**
 * Target: data-[mosaic-cell-state=dragging]
 */
const MOSAIC_CELL_STATE_ATTR = 'mosaic-cell-state';

type CellState = { type: 'idle' } | { type: 'preview'; container: HTMLElement; rect: DOMRect } | { type: 'dragging' };

const defaultAllowedEdges: Edge[] = ['top', 'bottom'];

type CellProps = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    dragHandle?: HTMLDivElement | null;
    allowedEdges?: Edge[];
    gap?: { x?: number; y?: number };
    object: Obj.Any;
  }>
>;

const Cell = forwardRef<HTMLDivElement, CellProps>(
  ({ classNames, children, asChild, dragHandle, allowedEdges = defaultAllowedEdges, gap, object }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = composeRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;
    const { id: containerId } = useMosaicContainerContext(Cell.displayName!);
    const [state, setState] = useState<CellState>({ type: 'idle' });
    const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

    useLayoutEffect(() => {
      const root = rootRef.current;
      if (!root || !containerId) {
        return;
      }

      const data = {
        type: 'cell',
        id: object.id,
        containerId,
        object,
      } satisfies MosaicCellData;

      return combine(
        draggable({
          element: root,
          dragHandle: dragHandle && state.type !== 'preview' ? dragHandle : undefined,
          getInitialData: () => data,
          onGenerateDragPreview: ({ location, nativeSetDragImage }) => {
            const rect = root.getBoundingClientRect();
            setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: (args) => {
                const { x, y } = preserveOffsetOnSource({
                  element: root,
                  input: location.current.input,
                })(args);

                return { x: x - (gap?.x ?? 0), y: y - (gap?.y ?? 0) };
              },
              render: ({ container }) => {
                setState({ type: 'preview', container, rect });
                return () => setState({ type: 'dragging' });
              },
            });
          },
          onDragStart: () => {
            setState({ type: 'dragging' });
          },
          onDrop: () => {
            setState({ type: 'idle' });
          },
        }),
        dropTargetForElements({
          element: root,
          getData: ({ input, element }) => {
            return attachClosestEdge(data, { input, element, allowedEdges });
          },
          onDragEnter: ({ source, self }) => {
            if (source.data.id !== object.id) {
              setClosestEdge(extractClosestEdge(self.data));
            }
          },
          onDrag: ({ source, self }) => {
            if (source.data.id !== object.id) {
              setClosestEdge(extractClosestEdge(self.data));
            }
          },
          onDragLeave: () => {
            setClosestEdge(null);
          },
          onDrop: () => {
            setClosestEdge(null);
          },
        }),
      );
    }, [rootRef, dragHandle, object, containerId]);

    // NOTE: Ensure no gaps between cells (prevent drop indicators flickering).
    // NOTE: Ensure padding doesn't change position of cursor when dragging (no margins).
    return (
      <>
        <Root
          {...{ [`data-${MOSAIC_CELL_STATE_ATTR}`]: state.type }}
          role='none'
          className={mx('relative transition-opacity', classNames)}
          style={{
            paddingTop: gap?.y ?? 0,
            paddingBottom: gap?.y ?? 0,
          }}
          ref={composedRef}
        >
          {children}
          {closestEdge && <DropIndicator edge={closestEdge} />}
        </Root>

        {state.type === 'preview' &&
          createPortal(
            <Root
              {...{ [`data-${MOSAIC_CELL_STATE_ATTR}`]: state.type }}
              role='none'
              className={mx(classNames)}
              style={
                {
                  width: `${state.rect.width}px`,
                  height: `${state.rect.height - 8}px`,
                } as CSSProperties
              }
            >
              {children}
            </Root>,
            state.container,
          )}
      </>
    );
  },
);

Cell.displayName = 'MosaicCell';

//
// Placeholder
//

type PlaceholderProps<Location = any> = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    location: Location;
  }>
>;

const Placeholder = <Location = any,>({ classNames, children, asChild, location }: PlaceholderProps<Location>) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const Root = asChild ? Slot : Primitive.div;
  const { id: containerId } = useMosaicContainerContext(Placeholder.displayName!);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    return dropTargetForElements({
      element: root,
      getData: () => {
        return {
          type: 'placeholder',
          containerId,
          location,
        } satisfies MosaicPlaceholderData<Location>;
      },
    });
  }, [rootRef, containerId, location]);

  return (
    <Root role='none' ref={rootRef} className={mx(classNames)}>
      {children}
    </Root>
  );
};

Placeholder.displayName = 'MosaicPlaceholder';

//
// Mosaic
//

export const Mosaic = {
  Root,
  Container,
  Cell,
  Placeholder,
};

export type {
  RootProps as MosaicRootProps,
  ContainerProps as MosaicContainerProps,
  CellProps as MosaicCellProps,
  PlaceholderProps as MosiacPlaceholderProps,
};

export { useMosaicContext, useMosaicContainerContext };

export { MOSAIC_CONTAINER_STATE_ATTR, MOSAIC_CELL_STATE_ATTR };
