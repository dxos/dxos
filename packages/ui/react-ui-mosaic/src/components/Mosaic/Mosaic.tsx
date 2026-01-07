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
import {
  DropIndicator as NativeDropIndicator,
  type DropIndicatorProps as NativeDropIndicatorProps,
} from '@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box';
import { composeRefs, useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot, Slottable } from '@radix-ui/react-slot';
import React, {
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { type Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { useFocus } from '../Focus';

import {
  type MosaicCellData,
  type MosaicContainerData,
  type MosaicData,
  type MosaicEventHandler,
  type MosaicPlaceholderData,
  type MosaicTargetData,
} from './types';

//
// Context
//

type DraggingState = {
  // TODO(burdon): Split container and target.
  source: MosaicCellData;

  // TODO(burdon): Split container and target.
  target?: MosaicData;
};

type RootContextValue = {
  containers: Record<string, MosaicEventHandler>;
  addContainer: (container: MosaicEventHandler) => void;
  removeContainer: (id: string) => void;
  dragging?: DraggingState;
};

const [RootContextProvider, useRootContext] = createContext<RootContextValue>('MosaicRoot');

//
// Root
//

type RootProps = PropsWithChildren;

const Root = ({ children }: RootProps) => {
  const [handlers, setHandlers] = useState<Record<string, MosaicEventHandler>>({});
  const [dragging, setDragging] = useState<DraggingState | undefined>();
  const currentHandler = useRef<MosaicEventHandler>(undefined);

  const getSourceHandler = useCallback(
    (source: ElementDragPayload): { data: MosaicCellData; handler?: MosaicEventHandler } => {
      const data = source.data as MosaicCellData;
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

      return {};
    },
    [handlers],
  );

  useEffect(() => {
    // Main controller.
    return monitorForElements({
      /**
       * Dragging started within any container.
       */
      onDragStart: ({ source, location }) => {
        log.info('Root.onDragStart', {
          source: source.data,
          location: location.current.dropTargets.map((target) => target.data),
        });
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
       * Dragging entered a new container.
       */
      onDropTargetChange: ({ source, location }) => {
        log.info('Root.onDropTargetChange', {
          source: source.data,
          location: location.current.dropTargets.map((target) => target.data),
        });

        const { data: sourceData } = getSourceHandler(source);
        const { data: targetData, handler } = getTargetHandler(location);
        setDragging({ source: sourceData, target: targetData });
        currentHandler.current?.onCancel?.(); // TODO(burdon): ???
        currentHandler.current = handler;
      },
      /**
       * Dragging ended.
       */
      onDrop: ({ source, location }) => {
        log.info('Root.onDrop', {
          source: source.data,
          location: location.current.dropTargets.map((target) => target.data),
        });

        try {
          // If cancelled (e.g., user pressed Escape) then there are no drop targets.
          if (location.current.dropTargets.length > 0) {
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

            // TODO(burdon): Check object doesn't already exist in the collection.
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
          }
        } finally {
          setDragging(undefined);
          currentHandler.current?.onCancel?.();
          currentHandler.current = undefined;
        }
      },
    });
  }, [handlers, getSourceHandler, getTargetHandler]);

  return (
    <RootContextProvider
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
    </RootContextProvider>
  );
};

//
// Container
//

type ContainerState = { type: 'idle' } | { type: 'active'; bounds?: DOMRect };

type ContainerLayout = 'horizontal' | 'vertical' | 'grid';

type ContainerContextValue = {
  id: string;
  layout?: ContainerLayout;
  dragging?: DraggingState;
  state: ContainerState;

  /** Active drop target (used to determine placeholder location). */
  activeTarget?: MosaicTargetData;
  setActiveTarget: (target: MosaicTargetData | undefined) => void;
};

const [ContainerContextProvider, useContainerContext] = createContext<ContainerContextValue>('MosaicContainer');

/** Target: [&:has(>_[data-mosaic-container-state=active])] */
const CONTAINER_STATE_ATTR = 'mosaic-container-state';

/** CSS variable: [var(--mosaic-placeholder-height)] */
const CONTAINER_PLACEHOLDER_HEIGHT = '--mosaic-placeholder-height';

type ContainerProps = ThemedClassName<
  PropsWithChildren<
    Pick<ContainerContextValue, 'layout'> & {
      asChild?: boolean;
      autoscroll?: boolean;
      withFocus?: boolean;
      handler: MosaicEventHandler;
      debug?: ReactNode;
    }
  >
>;

/**
 * Ref https://www.radix-ui.com/primitives/docs/guides/composition
 * NOTE: Children must forwardRef and spread props to root element.
 */
const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ classNames, children, layout = 'vertical', asChild, autoscroll, withFocus, handler, debug }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    // State.
    const { dragging } = useRootContext(Container.displayName!);
    const [state, setState] = useState<ContainerState>({ type: 'idle' });
    const [activeTarget, setActiveTarget] = useState<MosaicTargetData | undefined>();

    // Focus container.
    const { setFocus } = useFocus();
    useEffect(() => {
      if (withFocus) {
        setFocus?.(state.type === 'active' ? 'active' : undefined);
      }
    }, [setFocus, withFocus, state]);

    // Register handler.
    const { addContainer, removeContainer } = useRootContext(handler.id);
    useEffect(() => {
      addContainer(handler);
      return () => removeContainer(handler.id);
    }, [handler]);

    const data = useMemo<MosaicContainerData>(
      () =>
        ({
          type: 'container',
          id: handler.id,
        }) satisfies MosaicContainerData,
      [handler.id],
    );

    useEffect(() => {
      if (!rootRef.current) {
        return;
      }

      return combine(
        ...[
          autoscroll &&
            autoScrollForElements({
              element: rootRef.current,
            }),

          // Target.
          dropTargetForElements({
            element: rootRef.current,
            getData: () => data,

            // Test if permitted to drop here.
            canDrop: ({ source }) => {
              return (
                (source.data.type === 'cell' && handler.canDrop?.({ source: source.data as MosaicCellData })) || false
              );
            },

            /**
             * Dragging started in this container.
             */
            onDragStart: ({ source }) => {
              const sourceData = source.data as MosaicCellData;
              setState({ type: 'active', bounds: sourceData.bounds });
            },
            /**
             * Dragging entered this container.
             */
            onDragEnter: ({ source }) => {
              const sourceData = source.data as MosaicCellData;
              setState({ type: 'active', bounds: sourceData.bounds });
            },
            /**
             * Dragging left this container.
             * NOTE: If the container isn't full-height, then when the dragged item is temporarily removed the container will shrink,
             * triggering `onDragLeave`, which then causes the item to be added and removed continually (flickering).
             */
            onDragLeave: () => {
              setState({ type: 'idle' });
            },
            /**
             * Dropped in this container.
             */
            onDrop: () => {
              setState({ type: 'idle' });
            },
          }),
        ].filter(isTruthy),
      );
    }, [rootRef, handler, data]);

    return (
      <ContainerContextProvider
        id={handler.id}
        layout={layout}
        state={state}
        dragging={state.type === 'active' ? dragging : undefined}
        activeTarget={activeTarget}
        setActiveTarget={setActiveTarget}
      >
        <Root
          {...{
            [`data-${CONTAINER_STATE_ATTR}`]: state.type,
          }}
          style={
            {
              [CONTAINER_PLACEHOLDER_HEIGHT]:
                state.type === 'active' && state.bounds ? `${state.bounds.height}px` : '0px',
            } as CSSProperties
          }
          role='list'
          className={mx('bs-full', classNames)}
          ref={composedRef}
        >
          <Slottable>{children}</Slottable>
          {debug}
        </Root>
      </ContainerContextProvider>
    );
  },
);

Container.displayName = 'MosaicContainer';

//
// Cell
//

/** Must implement value equivalence. */
type LocationType = string | number;

type CellState =
  | { type: 'idle' }
  | { type: 'preview'; container: HTMLElement; rect: DOMRect }
  | { type: 'dragging' }
  | { type: 'target'; closestEdge: Edge | null };

type CellContextValue = {
  state: CellState;
};

const [CellContextProvider, useCellContext] = createContext<CellContextValue>('MosaicCell');

/** Target: data-[mosaic-cell-state=dragging] */
const CELL_STATE_ATTR = 'mosaic-cell-state';

type CellProps<T extends Obj.Any = Obj.Any, Location = LocationType> = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    dragHandle?: HTMLDivElement | null;
    allowedEdges?: Edge[];
    location: Location;
    object: T;
  }>
>;

const Cell = forwardRef<HTMLDivElement, CellProps>(
  ({ classNames, children, asChild, dragHandle, allowedEdges: allowedEdgesProp, location, object }, forwardedRef) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = composeRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    // State.
    const { id: containerId, layout, setActiveTarget } = useContainerContext(Cell.displayName!);
    const [state, setState] = useState<CellState>({ type: 'idle' });

    const allowedEdges = useMemo<Edge[]>(
      () => allowedEdgesProp || (layout === 'vertical' ? ['top', 'bottom'] : ['left', 'right']),
      [allowedEdgesProp, layout],
    );

    const data = useMemo<MosaicCellData>(
      () =>
        ({
          type: 'cell',
          id: object.id,
          containerId,
          location,
          object,
        }) satisfies MosaicCellData,
      [containerId, location, object],
    );

    useLayoutEffect(() => {
      const root = rootRef.current;
      if (!root || !containerId) {
        return;
      }

      return combine(
        // Source.
        draggable({
          element: root,
          dragHandle: dragHandle && state.type !== 'preview' ? dragHandle : undefined,
          canDrag: () => true,
          getInitialData: () => data,
          onGenerateDragPreview: ({ location, nativeSetDragImage }) => {
            setCustomNativeDragPreview({
              nativeSetDragImage,
              getOffset: preserveOffsetOnSource({ element: root, input: location.current.input }),
              render: ({ container }) => {
                data.bounds = root.getBoundingClientRect();
                setState({ type: 'preview', container, rect: root.getBoundingClientRect() });
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

        // Target.
        dropTargetForElements({
          element: root,
          getData: ({ input, element }) => {
            return attachClosestEdge(data, { input, element, allowedEdges });
          },
          onDragEnter: ({ self, source }) => {
            if (source.data.id !== object.id) {
              setState({ type: 'target', closestEdge: extractClosestEdge(self.data) });
              setActiveTarget(data);
            }
          },
          onDragLeave: () => {
            setState({ type: 'idle' });
            setActiveTarget(undefined);
          },
          onDrop: () => {
            setState({ type: 'idle' });
            setActiveTarget(undefined);
          },
        }),
      );
    }, [rootRef, dragHandle, data, allowedEdges, setActiveTarget]);

    // NOTE: Ensure no gaps between cells (prevent drop indicators flickering).
    // NOTE: Ensure padding doesn't change position of cursor when dragging (no margins).
    return (
      <CellContextProvider state={state}>
        <Root
          {...{
            [`data-${CELL_STATE_ATTR}`]: state.type,
          }}
          role='listitem'
          className={mx('relative transition-opacity', classNames)}
          ref={composedRef}
        >
          <Slottable>{children}</Slottable>
        </Root>

        {state.type === 'preview' &&
          createPortal(
            <Root
              {...{
                [`data-${CELL_STATE_ATTR}`]: state.type,
              }}
              role='none'
              className={mx(classNames)}
              style={
                {
                  width: `${state.rect.width}px`,
                  height: `${state.rect.height}px`,
                } as CSSProperties
              }
            >
              {children}
            </Root>,
            state.container,
          )}
      </CellContextProvider>
    );
  },
);

Cell.displayName = 'MosaicCell';

//
// Placeholder
//

type PlaceholderState = { type: 'idle' } | { type: 'active' };

/** Target: data-[mosaic-placeholder-state=active] */
const PLACEHOLDER_STATE_ATTR = 'mosaic-placeholder-state';

type PlaceholderProps<Location = LocationType> = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    location: Location;
  }>
>;

const Placeholder = <Location extends LocationType = LocationType>({
  classNames,
  children,
  asChild,
  location,
}: PlaceholderProps<Location>) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const Root = asChild ? Slot : Primitive.div;
  const { id: containerId, activeTarget, setActiveTarget } = useContainerContext(Placeholder.displayName!);
  const [state, setState] = useState<PlaceholderState>({ type: 'idle' });

  const data = useMemo<MosaicPlaceholderData<Location>>(
    () =>
      ({
        type: 'placeholder',
        containerId,
        location,
      }) satisfies MosaicPlaceholderData<Location>,
    [containerId, location],
  );

  useEffect(() => {
    setState({ type: data.location === activeTarget?.location ? 'active' : 'idle' });
  }, [data, activeTarget]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    return dropTargetForElements({
      element: root,
      getData: () => data,
      onDragEnter: () => {
        setState({ type: 'active' });
        setActiveTarget(data);
      },
      onDragLeave: () => {
        setState({ type: 'idle' });
        setActiveTarget(undefined);
      },
      onDrop: () => {
        setState({ type: 'idle' });
        setActiveTarget(undefined);
      },
    });
  }, [rootRef, data, setActiveTarget]);

  return (
    <Root
      {...{
        [`data-${PLACEHOLDER_STATE_ATTR}`]: state.type,
      }}
      role='none'
      className={mx('relative', classNames)}
      ref={rootRef}
    >
      <Slottable>{children}</Slottable>
    </Root>
  );
};

Placeholder.displayName = 'MosaicPlaceholder';

//
// DropIndicator
//

type DropIndicatorProps = Omit<NativeDropIndicatorProps, 'edge'>;

const DropIndicator = (props: DropIndicatorProps) => {
  const { state } = useCellContext(DropIndicator.displayName!);
  return state.type === 'target' && state.closestEdge ? (
    <NativeDropIndicator {...props} edge={state.closestEdge} />
  ) : null;
};

DropIndicator.displayName = 'MosaicDropIndicator';

//
// Mosaic
//

export const Mosaic = {
  Root,
  Container,
  Cell,
  Placeholder,
  DropIndicator,
};

export type {
  RootProps as MosaicRootProps,
  ContainerProps as MosaicContainerProps,
  CellProps as MosaicCellProps,
  PlaceholderProps as MosiacPlaceholderProps,
  DropIndicatorProps as MosaicDropIndicatorProps,
};

export { useRootContext as useMosaic, useContainerContext as useMosaicContainer, useCellContext as useMosaicCell };
