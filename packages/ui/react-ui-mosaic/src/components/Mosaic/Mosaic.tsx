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
import { type DragLocationHistory, type DropTargetRecord } from '@atlaskit/pragmatic-drag-and-drop/types';
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
import { Slot } from '@radix-ui/react-slot';
import { bind } from 'bind-event-listener';
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

import { log } from '@dxos/log';
import {
  type AllowedAxis,
  type Axis,
  Scrollable,
  type ScrollableProps,
  type SlottableClassName,
  type ThemedClassName,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { useFocus } from '../Focus';
import { Stack, type StackProps, VirtualStack } from '../Stack';

import {
  type MosaicContainerData,
  type MosaicData,
  type MosaicEventHandler,
  type MosaicPlaceholderData,
  type MosaicTileData,
} from './types';

//
// Mosaic Drag-and-drop
//
// Drop targets:
// - Placeholders exist to allow gaps but prevent deadspace when dragging within a container.
// - When dragging over a Tile, the placeholder next to the closest edge is activated.
// - Placeholders expand when active; event handlers are disabled while the container is scrolling.
//
// [Container]
// - [Placeholder 0.5]
// - [Tile        1  ]
// - [Placeholder 1.5]
// - [Tile        2  ]
// - [Placeholder 2.5]
// - [Tile        3  ]
// - [Placeholder 3.5]
//
// Implementation Notes
// - We use [Radix composition](https://www.radix-ui.com/primitives/docs/guides/composition) to factor out composible aspects (e.g., Focus, Mosaic, etc.)
// - NOTE: Use Slottable only if needed to disambiguate; otherwise a suspected Radix bug causes compositional problems.

//
// Types
//

const getSourceData = <TData = any, TLocation = any>(
  source: ElementDragPayload,
): MosaicTileData<TData, TLocation> | null => {
  return source.data.type === 'tile' ? (source.data as MosaicTileData<TData, TLocation>) : null;
};

//
// Context
//

type DraggingSource = {
  data: MosaicTileData;
  handler?: MosaicEventHandler;
  container?: Element;
};

type DraggingTarget = {
  data: MosaicData;
  handler?: MosaicEventHandler;
};

type DraggingState = {
  source: DraggingSource;
  target?: DraggingTarget;
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

const ROOT_NAME = 'Mosaic.Root';

// State attribute: [&:has(>_[data-mosaic-debug=true])]
const ROOT_DEBUG_ATTR = 'mosaic-debug';

type RootProps = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    debug?: boolean;
  }>
>;

const Root = forwardRef<HTMLDivElement, RootProps>(({ classNames, children, asChild, debug }, forwardedRef) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
  const Root = asChild ? Slot : Primitive.div;

  const [handlers, setHandlers] = useState<Record<string, MosaicEventHandler>>({});
  const [dragging, setDragging] = useState<DraggingState | undefined>();

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
      <Root
        className={mx('group', classNames)}
        {...{
          [`data-${ROOT_DEBUG_ATTR}`]: debug,
        }}
        ref={composedRef}
      >
        {children}
      </Root>
    </RootContextProvider>
  );
});

Root.displayName = ROOT_NAME;

//
// Container
//

const CONTAINER_NAME = 'Mosaic.Container';

type ContainerState = { type: 'idle' } | { type: 'active'; bounds?: DOMRect };

type ContainerContextValue<TData = any, Location = LocationType> = {
  id: string;
  eventHandler: MosaicEventHandler<TData>;
  axis?: AllowedAxis;
  dragging?: DraggingState;
  scrolling?: boolean;
  state: ContainerState;

  /** Active drop location. */
  activeLocation?: Location;
  setActiveLocation: (location: Location | undefined) => void;
};

const [ContainerContextProvider, useContainerContext] = createContext<ContainerContextValue>('MosaicContainer');

// State attribute: [&:has(>_[data-mosaic-container-state=active])]
const CONTAINER_STATE_ATTR = 'mosaic-container-state';

// CSS variables: [var(--mosaic-placeholder-xxx)]
const CONTAINER_PLACEHOLDER_WIDTH = '--mosaic-placeholder-width';
const CONTAINER_PLACEHOLDER_HEIGHT = '--mosaic-placeholder-height';

type ContainerProps = SlottableClassName<
  PropsWithChildren<
    Partial<Pick<ContainerContextValue, 'eventHandler' | 'axis'>> & {
      asChild?: boolean;
      autoScroll?: HTMLElement | null;
      withFocus?: boolean;
      debug?: () => ReactNode;
    }
  >
>;

let counter = 0;

// TODO(burdon): Make generic.
const Container = forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      className,
      classNames,
      children,
      eventHandler: eventHandlerProp,
      axis = 'vertical',
      asChild,
      autoScroll: autoscrollElement,
      withFocus,
      debug,
      ...props
    }: ContainerProps,
    forwardedRef,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    // Handler.
    const eventHandler = useMemo(
      () =>
        eventHandlerProp ?? {
          id: `mosaic-container-${counter++}`,
        },
      [eventHandlerProp],
    );

    // State.
    const { dragging } = useRootContext(CONTAINER_NAME);
    const [state, setState] = useState<ContainerState>({ type: 'idle' });
    const [activeLocation, setActiveLocation] = useState<LocationType | undefined>();
    const [scrolling, setScrolling] = useState(false);

    // Focus container.
    const { setFocus } = useFocus();
    useEffect(() => {
      if (withFocus) {
        setFocus?.(state.type === 'active' ? 'active' : undefined);
      }
    }, [setFocus, withFocus, state]);

    // Register handler.
    const { addContainer, removeContainer } = useRootContext(eventHandler.id);
    useEffect(() => {
      addContainer(eventHandler);
      return () => removeContainer(eventHandler.id);
    }, [eventHandler]);

    const data = useMemo<MosaicContainerData>(
      () =>
        ({
          type: 'container',
          id: eventHandler.id,
        }) satisfies MosaicContainerData,
      [eventHandler.id],
    );

    useEffect(() => {
      if (!rootRef.current) {
        return;
      }

      // Determine if scrolling (pause drag/drop handlers).
      let timeout: ReturnType<typeof setTimeout>;
      const handleScroll = () => {
        setScrolling(true);
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          setScrolling(false);
        }, 500);
      };

      return combine(
        ...[
          /**
           * Custom event for dragging cancellation.
           */
          bind(rootRef.current, {
            type: 'dnd:cancel',
            listener: () => {
              setState({ type: 'idle' });
            },
          }),

          // Target.
          dropTargetForElements({
            element: rootRef.current,
            getData: () => data,

            /**
             * Test if permitted to drop here.
             * NOTE: Contained Tile and Placeholder elements do the same.
             */
            canDrop: ({ source }) => {
              const data = getSourceData(source);
              return (data && eventHandler.canDrop?.({ source: data })) || false;
            },

            // TODO(burdon): Provide semantic intent to onDrop.
            // getDropEffect: () => {
            //   return 'move';
            // },

            /**
             * Dragging started in this container.
             */
            onDragStart: ({ source }) => {
              const sourceData = source.data as MosaicTileData;
              setState({ type: 'active', bounds: sourceData.bounds });
            },
            /**
             * Dragging entered this container.
             */
            onDragEnter: ({ source }) => {
              const sourceData = source.data as MosaicTileData;
              setState({ type: 'active', bounds: sourceData.bounds });
            },
            /**
             * Dragging left this container.
             * NOTE: If the container isn't full-height, then when the dragged item is temporarily removed the container will shrink,
             * triggering `onDragLeave`, which then causes the item to be added and removed continually (flickering).
             */
            onDragLeave: ({ source }) => {
              const sourceData = source.data as MosaicTileData;
              if (sourceData.containerId !== eventHandler.id) {
                setState({ type: 'idle' });
              }
            },
            /**
             * Dropped in this container.
             */
            onDrop: () => {
              setState({ type: 'idle' });
            },
          }),

          // Autoscroll.
          // NOTE: When used with Scrollable we get a spurious warning (in dev mode).
          // "Auto scrolling has been attached to an element that appears not to be scrollable."
          autoscrollElement && [
            autoScrollForElements({
              element: autoscrollElement,
              // canScroll: ({ element: _ }) => {
              //   return true;
              // },
              getAllowedAxis: () => axis,
              getConfiguration: () => ({
                maxScrollSpeed: 'fast',
              }),
            }),

            bind(autoscrollElement, {
              type: 'scroll',
              listener: handleScroll,
            }),

            () => setScrolling(false),
          ],
        ]
          .filter(isTruthy)
          .flatMap((x) => x),
      );
    }, [rootRef, eventHandler, data, autoscrollElement]);

    return (
      <ContainerContextProvider
        id={eventHandler.id}
        eventHandler={eventHandler}
        axis={axis}
        state={state}
        dragging={state.type === 'active' ? dragging : undefined}
        scrolling={scrolling}
        activeLocation={activeLocation}
        setActiveLocation={setActiveLocation}
      >
        <Root
          className={mx('bs-full', className, classNames)}
          style={
            {
              [CONTAINER_PLACEHOLDER_WIDTH]:
                state.type === 'active' && state.bounds ? `${state.bounds.width}px` : '0px',
              [CONTAINER_PLACEHOLDER_HEIGHT]:
                state.type === 'active' && state.bounds ? `${state.bounds.height}px` : '0px',
            } as CSSProperties
          }
          {...props}
          {...{
            [`data-${CONTAINER_STATE_ATTR}`]: state.type,
          }}
          ref={composedRef}
        >
          {children}
        </Root>
        {debug?.()}
      </ContainerContextProvider>
    );
  },
);

Container.displayName = CONTAINER_NAME;

//
// Viewport
//

const VIEWPORT_NAME = 'Mosaic.Viewport';

type ViewportProps = ScrollableProps;

const Viewport = (props: ViewportProps) => {
  const { axis } = useContainerContext(VIEWPORT_NAME);
  return <Scrollable {...props} axis={axis} />;
};

Viewport.displayName = VIEWPORT_NAME;

//
// Tile
//

const TILE_NAME = 'Mosaic.Tile';

/** Must implement value equivalence. */
type LocationType = string | number;

type TileState =
  | { type: 'idle' }
  | { type: 'preview'; container: HTMLElement; rect: DOMRect }
  | { type: 'dragging' }
  | { type: 'target'; closestEdge: Edge | null };

type TileContextValue = {
  state: TileState;
};

const [TileContextProvider, useTileContext] = createContext<TileContextValue>('MosaicTile');

// State attribute: data-[mosaic-tile-state=dragging]
const TILE_STATE_ATTR = 'mosaic-tile-state';

type TileProps<TData = any, TLocation = LocationType> = SlottableClassName<
  PropsWithChildren<{
    asChild?: boolean;
    dragHandle?: HTMLElement | null;
    allowedEdges?: Edge[];
    id: string;
    data: TData;
    location: TLocation;
    draggable?: boolean; // TODO(burdon): Not currently implemented.
    debug?: boolean;
  }>
>;

const Tile = forwardRef<HTMLDivElement, TileProps>(
  (
    {
      className,
      classNames,
      children,
      asChild,
      dragHandle,
      allowedEdges: allowedEdgesProp,
      location,
      id,
      data: dataProp,
      debug: _,
    }: TileProps,
    forwardedRef,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = composeRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    // State.
    const { id: containerId, eventHandler, axis, scrolling, setActiveLocation } = useContainerContext(TILE_NAME);
    const [state, setState] = useState<TileState>({ type: 'idle' });

    const allowedEdges = useMemo<Edge[]>(
      () => allowedEdgesProp || (axis === 'vertical' ? ['top', 'bottom'] : ['left', 'right']),
      [allowedEdgesProp, axis],
    );

    const data = useMemo<MosaicTileData>(
      () =>
        ({
          type: 'tile',
          id,
          containerId,
          data: dataProp,
          location,
        }) satisfies MosaicTileData,
      [containerId, location, dataProp],
    );

    useLayoutEffect(() => {
      const root = rootRef.current;
      if (!root || !containerId || scrolling) {
        return;
      }

      const handleChange = ({ self, source }: { self: DropTargetRecord; source: ElementDragPayload }) => {
        if (source.data.id !== dataProp.id) {
          const closestEdge = extractClosestEdge(self.data);
          const location = data.location + (closestEdge === 'top' || closestEdge === 'left' ? -0.5 : 0.5);
          setActiveLocation(location);
          setState({ type: 'target', closestEdge });
        }
      };

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
              getOffset: preserveOffsetOnSource({
                element: root,
                input: location.current.input,
              }),
              render: ({ container }) => {
                data.bounds = root.getBoundingClientRect();
                setState({
                  type: 'preview',
                  container,
                  rect: root.getBoundingClientRect(),
                });
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
          getData: ({ input, element }) => attachClosestEdge(data, { input, element, allowedEdges }),
          canDrop: ({ source }) => {
            const data = getSourceData(source);
            return (data && eventHandler.canDrop?.({ source: data })) || false;
          },
          onDragEnter: ({ self, source }) => {
            handleChange({ self, source });
          },
          onDragLeave: () => {
            setState({ type: 'idle' });
            setActiveLocation(undefined);
          },
          onDrag: ({ self, source }) => {
            handleChange({ self, source });
          },
          onDrop: () => {
            setState({ type: 'idle' });
            setActiveLocation(undefined);
          },
        }),
      );
    }, [rootRef, dragHandle, eventHandler, data, scrolling, allowedEdges, setActiveLocation]);

    // NOTE: Ensure no gaps between cells (prevent drop indicators flickering).
    // NOTE: Ensure padding doesn't change position of cursor when dragging (no margins).
    return (
      <TileContextProvider state={state}>
        <Root
          {...{
            [`data-${TILE_STATE_ATTR}`]: state.type,
          }}
          role='listitem'
          className={mx('relative', className, classNames)}
          ref={composedRef}
        >
          {children}
        </Root>

        {state.type === 'preview' &&
          createPortal(
            <Root
              {...{
                // NOTE: Use to control appearance while dragging.
                [`data-${TILE_STATE_ATTR}`]: state.type,
              }}
              // TODO(burdon): Configure drop animation.
              className={mx('relative', className, classNames)}
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
      </TileContextProvider>
    );
  },
);

Tile.displayName = TILE_NAME;

//
// Placeholder
//

const PLACEHOLDER_NAME = 'Mosaic.Placeholder';

// Axis: data-[mosaic-placeholder-axis=vertical]
const PLACEHOLDER_AXIS_ATTR = 'mosaic-placeholder-axis';

// State attribute: data-[mosaic-placeholder-state=active]
const PLACEHOLDER_STATE_ATTR = 'mosaic-placeholder-state';

type PlaceholderProps<Location = LocationType> = ThemedClassName<
  PropsWithChildren<{
    asChild?: boolean;
    axis?: Axis;
    location: Location;
  }>
>;

const Placeholder = <Location extends LocationType = LocationType>({
  classNames,
  children,
  asChild,
  axis = 'vertical',
  location,
}: PlaceholderProps<Location>) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const Root = asChild ? Slot : Primitive.div;
  const {
    id: containerId,
    eventHandler,
    scrolling,
    activeLocation,
    setActiveLocation,
  } = useContainerContext(PLACEHOLDER_NAME);
  const data = useMemo<MosaicPlaceholderData<Location>>(
    () =>
      ({
        type: 'placeholder',
        containerId,
        location,
      }) satisfies MosaicPlaceholderData<Location>,
    [containerId, location],
  );

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || scrolling) {
      return;
    }

    return dropTargetForElements({
      element: root,
      getData: () => data,
      canDrop: ({ source }) => {
        const data = getSourceData(source);
        return (data && eventHandler.canDrop?.({ source: data })) || false;
      },
      onDragEnter: () => {
        setActiveLocation(data.location);
      },
      onDragLeave: () => {
        setActiveLocation(undefined);
      },
      onDrop: () => {
        setActiveLocation(undefined);
      },
    });
  }, [rootRef, data, scrolling, setActiveLocation]);

  return (
    <Root
      {...{
        [`data-${PLACEHOLDER_AXIS_ATTR}`]: axis,
        [`data-${PLACEHOLDER_STATE_ATTR}`]: data.location === activeLocation ? 'active' : 'idle',
      }}
      role='none'
      className={mx('relative', classNames)}
      ref={rootRef}
    >
      {children}
    </Root>
  );
};

Placeholder.displayName = PLACEHOLDER_NAME;

//
// DropIndicator
// TODO(burdon): Support DropIndicator or Placeholder variants.
//

const DROP_INDICATOR_NAME = 'Mosaic.DropIndicator';

type DropIndicatorProps = Omit<NativeDropIndicatorProps, 'edge'>;

const DropIndicator = (props: DropIndicatorProps) => {
  const { state } = useTileContext(DROP_INDICATOR_NAME);
  return state.type === 'target' && state.closestEdge ? (
    <NativeDropIndicator {...props} edge={state.closestEdge} />
  ) : null;
};

DropIndicator.displayName = DROP_INDICATOR_NAME;

//
// Mosaic
//

export const Mosaic = {
  Root,
  Container,
  Tile,
  Placeholder,
  DropIndicator,
  Viewport,
  Stack,
  VirtualStack,
};

export type {
  RootProps as MosaicRootProps,
  ContainerProps as MosaicContainerProps,
  TileProps as MosaicTileProps,
  PlaceholderProps as MosiacPlaceholderProps,
  DropIndicatorProps as MosaicDropIndicatorProps,
  ViewportProps as MosaicViewportProps,
  StackProps as MosaicStackProps,
};

export { useRootContext as useMosaic, useContainerContext as useMosaicContainer, useTileContext as useMosaicTile };
