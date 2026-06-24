//
// Copyright 2025 DXOS.org
//

import {
  type Edge,
  attachClosestEdge,
  extractClosestEdge,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import {
  type ElementDragPayload,
  draggable,
  dropTargetForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { type DropTargetRecord } from '@atlaskit/pragmatic-drag-and-drop/types';
import { composeRefs } from '@radix-ui/react-compose-refs';
import { createContext } from '@radix-ui/react-context';
import { Primitive } from '@radix-ui/react-primitive';
import { Slot } from '@radix-ui/react-slot';
import React, { type PropsWithChildren, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type ThemedClassName } from '@dxos/react-ui';
import { composableProps, slottable } from '@dxos/react-ui';
import { type Size, resizeAttributes, sizeStyle } from '@dxos/react-ui-dnd';

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
  /** Current extent (rem) during/after resize; undefined when the tile is not sized. */
  size?: Size;
  /** Update the tile extent. A `commit` (drop) propagates to the consumer's `onSizeChange`. */
  setSize: (size: Size, commit?: boolean) => void;
};

const [MosaicTileContextProvider, useMosaicTileContext] = createContext<MosaicTileContextValue>('MosaicTile');

// State attribute: data-[mosaic-tile-state=dragging]
const MOSAIC_TILE_STATE_ATTR = 'mosaic-tile-state';

type MosaicTileProps<TData = any, TLocation = LocationType> = ThemedClassName<
  PropsWithChildren<{
    className?: string;
    dragHandle?: HTMLElement | null;
    allowedEdges?: Edge[];
    id: string;
    data: TData;
    location: TLocation;
    draggable?: boolean;
    /** Whether this tile is the current (aria-current) item. */
    current?: boolean;
    /** Whether this tile is selected (aria-selected). */
    selected?: boolean;
    /**
     * Initial extent in rem (width when the container is horizontal, height when vertical).
     * Pair with a child `Mosaic.ResizeHandle` to make the tile user-resizable; the consumer
     * persists committed sizes via {@link MosaicTileProps.onSizeChange}.
     */
    size?: Size;
    /** Called when the user commits a resize (on drop). */
    onSizeChange?: (size: Size) => void;
    debug?: boolean;
  }>
>;

const MosaicTile = slottable<HTMLDivElement, MosaicTileProps>(
  (
    {
      children,
      asChild,
      dragHandle,
      allowedEdges: allowedEdgesProp,
      location,
      id,
      data: dataProp,
      draggable: draggableProp,
      current,
      selected,
      size: sizeProp,
      onSizeChange,
      debug: _,
      ...props
    },
    forwardedRef,
  ) => {
    const Comp = asChild ? Slot : Primitive.div;
    const rootRef = useRef<HTMLDivElement>(null);
    const composedRef = composeRefs<HTMLDivElement>(rootRef, forwardedRef);

    // State.
    const {
      id: containerId,
      eventHandler,
      orientation,
      scrolling,
      setActiveLocation,
    } = useMosaicContainerContext(MOSAIC_TILE_NAME);
    const [state, setState] = useState<MosaicTileState>({ type: 'idle' });

    // Live extent during a resize drag. Seeded from the prop; the consumer persists committed
    // sizes via `onSizeChange` and feeds the result back as `size` on the next render.
    const [size, setInternalSize] = useState<Size | undefined>(sizeProp);
    const setSize = useCallback(
      (nextSize: Size, commit?: boolean) => {
        setInternalSize(nextSize);
        if (commit) {
          onSizeChange?.(nextSize);
        }
      },
      [onSizeChange],
    );

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
      if (!draggableProp || !root || !containerId || scrolling) {
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
    }, [
      rootRef,
      forwardedRef,
      containerId,
      dragHandle,
      eventHandler,
      data,
      scrolling,
      allowedEdges,
      setActiveLocation,
    ]);

    const { className, ...rest } = composableProps(props, { classNames: 'relative outline-none' });

    // Apply the resize subject marker + explicit extent only when sized, so unsized tiles keep
    // their intrinsic layout. The axis follows the container orientation (width vs height).
    const sized = size != null;
    const resizeStyle = sized ? sizeStyle(size, orientation === 'vertical' ? 'vertical' : 'horizontal') : undefined;

    // NOTE: Ensure no gaps between cells (prevent drop indicators flickering).
    // NOTE: Ensure padding doesn't change position of cursor when dragging (no margins).
    return (
      <MosaicTileContextProvider state={state} size={size} setSize={setSize}>
        <Comp
          {...rest}
          {...(sized && resizeAttributes)}
          {...(sized && { style: resizeStyle })}
          {...{
            'data-object-id': id,
            [`data-${MOSAIC_TILE_STATE_ATTR}`]: state.type,
          }}
          role='listitem'
          // Pair `current` / `selected` props with `aria-current` / `aria-selected`
          // so the `dx-current` / `dx-selected` / `dx-hover` utilities (which key
          // off those attributes) actually fire. Without this the props are purely
          // advisory and the corresponding styling silently no-ops.
          aria-current={current ? 'true' : undefined}
          aria-selected={selected ? 'true' : undefined}
          className={className}
          ref={composedRef}
        >
          {children}
        </Comp>

        {/* Dragging preview. */}
        {state.type === 'preview' &&
          createPortal(
            <Comp
              {...{
                // NOTE: Use to control appearance while dragging.
                [`data-${MOSAIC_TILE_STATE_ATTR}`]: state.type,
              }}
              className={className}
              style={{
                width: `${state.rect.width}px`,
                height: `${state.rect.height}px`,
              }}
            >
              {children}
            </Comp>,
            state.container,
          )}
      </MosaicTileContextProvider>
    );
  },
);

MosaicTile.displayName = MOSAIC_TILE_NAME;

export { MosaicTile, useMosaicTileContext };

export type { MosaicTileProps, MosaicTileState };
