//
// Copyright 2025 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  type ElementDragPayload,
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { type DropTargetRecord } from '@atlaskit/pragmatic-drag-and-drop/types';
import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, {
  type CSSProperties,
  type PropsWithChildren,
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { type SlottableClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { useMosaicContainerContext } from './Container';
import { type LocationType, type MosaicTileData, getSourceData } from './types';

//
// Tile
//

const MOSAIC_TILE_NAME = 'Mosaic.Tile';

type MosaicTileState =
  | { type: 'idle' }
  | { type: 'preview'; container: HTMLElement; rect: DOMRect }
  | { type: 'dragging' }
  | { type: 'target'; closestEdge: Edge | null };

type MosaicTileContextValue = {
  state: MosaicTileState;
};

const [MosaicTileContextProvider, useMosaicTileContext] = createContext<MosaicTileContextValue>('MosaicTile');

// State attribute: data-[mosaic-tile-state=dragging]
const MOSAIC_TILE_STATE_ATTR = 'mosaic-tile-state';

type MosaicTileProps<TData = any, TLocation = LocationType> = SlottableClassName<
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

const MosaicTile = forwardRef<HTMLDivElement, MosaicTileProps>(
  (
    {
      classNames,
      className,
      children,
      asChild,
      dragHandle,
      allowedEdges: allowedEdgesProp,
      location,
      id,
      data: dataProp,
      debug: _,
    }: MosaicTileProps,
    forwardedRef,
  ) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = composeRefs<HTMLDivElement>(rootRef, forwardedRef);
    const Root = asChild ? Slot : Primitive.div;

    // State.
    const {
      id: containerId,
      eventHandler,
      orientation,
      scrolling,
      setActiveLocation,
    } = useMosaicContainerContext(MOSAIC_TILE_NAME);
    const [state, setState] = useState<MosaicTileState>({ type: 'idle' });

    const allowedEdges = useMemo<Edge[]>(
      () => allowedEdgesProp || (orientation === 'vertical' ? ['top', 'bottom'] : ['left', 'right']),
      [allowedEdgesProp, orientation],
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
      <MosaicTileContextProvider state={state}>
        <Root
          {...{
            [`data-${MOSAIC_TILE_STATE_ATTR}`]: state.type,
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
                [`data-${MOSAIC_TILE_STATE_ATTR}`]: state.type,
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
      </MosaicTileContextProvider>
    );
  },
);

MosaicTile.displayName = MOSAIC_TILE_NAME;

export { MosaicTile, useMosaicTileContext };

export type { MosaicTileProps, MosaicTileState };
