//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { useComposedRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import { bind } from 'bind-event-listener';
import React, {
  type CSSProperties,
  type PropsWithChildren,
  type ReactNode,
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type AllowedAxis, type SlottableClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { isTruthy } from '@dxos/util';

import { useFocus } from '../Focus';

import { type MosaicDraggingState, useMosaicRootContext } from './Root';
import {
  type LocationType,
  type MosaicContainerData,
  type MosaicEventHandler,
  type MosaicTileData,
  getSourceData,
} from './types';

//
// Container
//

const MOSAIC_CONTAINER_NAME = 'Mosaic.Container';

type MosaicContainerState = { type: 'idle' } | { type: 'active'; bounds?: DOMRect };

type MosaicContainerContextValue<TData = any, Location = LocationType> = {
  id: string;
  eventHandler: MosaicEventHandler<TData>;
  orientation?: AllowedAxis;
  dragging?: MosaicDraggingState;
  scrolling?: boolean;
  state: MosaicContainerState;

  /** Active drop location. */
  activeLocation?: Location;
  setActiveLocation: (location: Location | undefined) => void;
};

const [MosaicContainerContextProvider, useMosaicContainerContext] =
  createContext<MosaicContainerContextValue>('MosaicContainer');

// State attribute: [&:has(>_[data-mosaic-container-state=active])]
const MOSAIC_CONTAINER_STATE_ATTR = 'mosaic-container-state';

// CSS variables: [var(--mosaic-placeholder-xxx)]
const MOSAIC_CONTAINER_PLACEHOLDER_WIDTH = '--mosaic-placeholder-width';
const MOSAIC_CONTAINER_PLACEHOLDER_HEIGHT = '--mosaic-placeholder-height';

let counter = 0;

type MosaicContainerProps = SlottableClassName<
  PropsWithChildren<
    Partial<Pick<MosaicContainerContextValue, 'eventHandler' | 'orientation'>> & {
      asChild?: boolean;
      autoScroll?: HTMLElement | null;
      withFocus?: boolean;
      debug?: () => ReactNode;
    }
  >
>;

// TODO(burdon): Make generic.
const MosaicContainer = forwardRef<HTMLDivElement, MosaicContainerProps>(
  (
    {
      classNames,
      className,
      children,
      eventHandler: eventHandlerProp,
      orientation = 'vertical',
      asChild,
      autoScroll: autoscrollElement,
      withFocus,
      debug,
      ...props
    }: MosaicContainerProps,
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
    const { dragging } = useMosaicRootContext(MOSAIC_CONTAINER_NAME);
    const [state, setState] = useState<MosaicContainerState>({ type: 'idle' });
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
    const { addContainer, removeContainer } = useMosaicRootContext(eventHandler.id);
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
      >
        <Root
          className={mx('h-full', className, classNames)}
          style={
            {
              [MOSAIC_CONTAINER_PLACEHOLDER_WIDTH]:
                state.type === 'active' && state.bounds ? `${state.bounds.width}px` : '0px',
              [MOSAIC_CONTAINER_PLACEHOLDER_HEIGHT]:
                state.type === 'active' && state.bounds ? `${state.bounds.height}px` : '0px',
            } as CSSProperties
          }
          {...props}
          {...{
            [`data-${MOSAIC_CONTAINER_STATE_ATTR}`]: state.type,
          }}
          ref={composedRef}
        >
          {children}
        </Root>
        {debug?.()}
      </MosaicContainerContextProvider>
    );
  },
);

MosaicContainer.displayName = MOSAIC_CONTAINER_NAME;

export { MosaicContainer, useMosaicContainerContext };

export type { MosaicContainerProps, MosaicContainerState };
