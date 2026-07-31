//
// Copyright 2025 DXOS.org
//

import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { bind } from 'bind-event-listener';
import React, {
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type AllowedAxis, composable, composableProps } from '@dxos/react-ui';
import {
  type DndContainerData,
  type DndContainerHandler,
  type DndDraggingState,
  type DndLocation,
  type DndTileData,
  getSourceData,
  useDndRootContext,
} from '@dxos/react-ui-dnd';
import { isTruthy } from '@dxos/util';

import { useFocus } from '../Focus';

//
// Container
//

const MOSAIC_CONTAINER_NAME = 'Mosaic.Container';

type MosaicContainerState = { type: 'idle' } | { type: 'active'; bounds?: DOMRect };

type MosaicContainerContextValue<TData = any, Location = DndLocation> = {
  id: string;
  eventHandler: DndContainerHandler<TData>;
  orientation?: AllowedAxis;
  dragging?: DndDraggingState;
  scrolling?: boolean;
  state: MosaicContainerState;

  /** Active drop location. */
  activeLocation?: Location;
  setActiveLocation: (location: Location | undefined) => void;

  /** ID of the current (aria-current) item. */
  currentId?: string;
  /** Set the current item by ID. */
  setCurrentId: (id: string | undefined) => void;

  /** IDs of selected (aria-selected) items. */
  selectedIds?: ReadonlySet<string>;
  /** Request to set or unset selection on an item by ID. */
  setSelected: (id: string, selected: boolean) => void;

  /** Register a scroll-to-item callback (provided by Stack/VirtualStack). */
  registerScrollTo: (fn: ((id: string) => void) | undefined) => void;
};

const [MosaicContainerContextProvider, useMosaicContainerContext] =
  createContext<MosaicContainerContextValue>('MosaicContainer');

// State attribute: [&:has(>_[data-mosaic-container-state=active])]
const MOSAIC_CONTAINER_STATE_ATTR = 'mosaic-container-state';

// Debug flag on the container's `group` element; Placeholder reads it via `group-data-[mosaic-debug=true]` (see styles.ts).
const MOSAIC_CONTAINER_DEBUG_ATTR = 'mosaic-debug';

// CSS variables: [var(--mosaic-placeholder-xxx)]
const MOSAIC_CONTAINER_PLACEHOLDER_WIDTH = '--mosaic-placeholder-width';
const MOSAIC_CONTAINER_PLACEHOLDER_HEIGHT = '--mosaic-placeholder-height';

let counter = 0;

/** Imperative handle for scrolling a stack to an item without changing the current/selected item. */
export type MosaicScrollController = {
  scrollToItem: (id: string) => void;
};

type MosaicContainerProps = PropsWithChildren<
  Partial<Pick<MosaicContainerContextValue, 'eventHandler' | 'orientation'>> & {
    asChild?: boolean;
    /** Support autoscrolling container when dragging. */
    autoScroll?: HTMLElement | null;
    withFocus?: boolean;
    /** Imperative handle to scroll the stack to an item (decoupled from selection). */
    controllerRef?: Ref<MosaicScrollController>;
    /** Controlled current-item ID. */
    currentId?: string;
    /** Called when a tile requests to become current. */
    onCurrentChange?: (id: string | undefined) => void;
    /** Controlled set of selected item IDs. */
    selectedIds?: ReadonlySet<string>;
    /** Called when a tile requests to toggle selection. */
    onSelectionChange?: (id: string, selected: boolean) => void;
    debug?: () => ReactNode;
    /** Toggles the `group` target that Placeholder's debug-highlight selectors read (see styles.ts). */
    placeholderDebug?: boolean;
  }
>;

/**
 * Container for a Mosaic layout.
 */
// TODO(burdon): Make generic.
const MosaicContainer = composable<HTMLDivElement, MosaicContainerProps>(
  (
    {
      children,
      eventHandler: eventHandlerProp,
      orientation = 'vertical',
      asChild,
      autoScroll: autoscrollElement,
      withFocus,
      controllerRef,
      currentId,
      onCurrentChange,
      selectedIds,
      onSelectionChange,
      debug,
      placeholderDebug,
      ...props
    },
    forwardedRef,
  ) => {
    const Comp = asChild ? Slot : Primitive.div;
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = useComposedRefs<HTMLDivElement>(rootRef, forwardedRef);

    // Handler.
    const eventHandler = useMemo(
      () =>
        eventHandlerProp ?? {
          id: `mosaic-container-${counter++}`,
        },
      [eventHandlerProp],
    );

    // State.
    const { dragging } = useDndRootContext(MOSAIC_CONTAINER_NAME);
    const [state, setState] = useState<MosaicContainerState>({ type: 'idle' });
    const [activeLocation, setActiveLocation] = useState<DndLocation | undefined>();
    const [scrolling, setScrolling] = useState(false);
    const setCurrentId = useCallback((id: string | undefined) => onCurrentChange?.(id), [onCurrentChange]);
    const setSelected = useCallback(
      (id: string, selected: boolean) => onSelectionChange?.(id, selected),
      [onSelectionChange],
    );

    // Scroll-to-item: Stack/VirtualStack registers its implementation.
    const scrollToRef = useRef<((id: string) => void) | undefined>(undefined);
    const registerScrollTo = useCallback((fn: ((id: string) => void) | undefined) => {
      scrollToRef.current = fn;
    }, []);

    // Imperative scroll-to-item, decoupled from selection (e.g. a calendar scrolling the stack to a day).
    useImperativeHandle(controllerRef, () => ({ scrollToItem: (id: string) => scrollToRef.current?.(id) }), []);

    // When currentId changes, scroll the matching item into view.
    useEffect(() => {
      if (currentId) {
        scrollToRef.current?.(currentId);
      }
    }, [currentId]);

    // Focus container.
    const { setFocus } = useFocus();
    useEffect(() => {
      if (withFocus) {
        setFocus?.(state.type === 'active' ? 'active' : undefined);
      }
    }, [setFocus, withFocus, state]);

    // Register handler.
    const { addContainer, removeContainer } = useDndRootContext(eventHandler.id);
    useEffect(() => {
      addContainer(eventHandler);
      return () => removeContainer(eventHandler.id);
    }, [eventHandler]);

    const data = useMemo<DndContainerData>(
      () =>
        ({
          type: 'container',
          id: eventHandler.id,
        }) satisfies DndContainerData,
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

            // Reorder is a move, not a copy — otherwise the browser shows the green "+" copy cursor.
            getDropEffect: () => 'move',

            /**
             * Dragging started in this container.
             */
            onDragStart: ({ source }) => {
              const sourceData = source.data as DndTileData;
              setState({ type: 'active', bounds: sourceData.bounds });
            },
            /**
             * Dragging entered this container.
             */
            onDragEnter: ({ source }) => {
              const sourceData = source.data as DndTileData;
              setState({ type: 'active', bounds: sourceData.bounds });
            },
            /**
             * Dragging left this container.
             * NOTE: If the container isn't full-height, then when the dragged item is temporarily removed the container will shrink,
             * triggering `onDragLeave`, which then causes the item to be added and removed continually (flickering).
             */
            onDragLeave: ({ source }) => {
              const sourceData = source.data as DndTileData;
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
              // Only autoscroll for tile (reorder) drags. Resize-handle drags carry no tile data, so
              // resizing a tile near a viewport edge must not scroll the container.
              canScroll: ({ source }) => getSourceData(source) != null,
              getAllowedAxis: () => orientation,
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
      <MosaicContainerContextProvider
        id={eventHandler.id}
        eventHandler={eventHandler}
        orientation={orientation}
        state={state}
        dragging={state.type === 'active' ? dragging : undefined}
        scrolling={scrolling}
        activeLocation={activeLocation}
        setActiveLocation={setActiveLocation}
        currentId={currentId}
        setCurrentId={setCurrentId}
        selectedIds={selectedIds}
        setSelected={setSelected}
        registerScrollTo={registerScrollTo}
      >
        <Comp
          {...composableProps(props, {
            classNames: 'h-full group',
            style: {
              [MOSAIC_CONTAINER_PLACEHOLDER_WIDTH]:
                state.type === 'active' && state.bounds ? `${state.bounds.width}px` : '0px',
              [MOSAIC_CONTAINER_PLACEHOLDER_HEIGHT]:
                state.type === 'active' && state.bounds ? `${state.bounds.height}px` : '0px',
            } as CSSProperties,
          })}
          {...{
            [`data-${MOSAIC_CONTAINER_STATE_ATTR}`]: state.type,
            [`data-${MOSAIC_CONTAINER_DEBUG_ATTR}`]: placeholderDebug,
          }}
          ref={composedRef}
        >
          {children}
        </Comp>
        {debug?.()}
      </MosaicContainerContextProvider>
    );
  },
);

MosaicContainer.displayName = MOSAIC_CONTAINER_NAME;

export { MosaicContainer, useMosaicContainerContext };

export type { MosaicContainerProps, MosaicContainerState };
