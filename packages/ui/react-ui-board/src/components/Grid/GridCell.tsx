//
// Copyright 2026 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import React, { type CSSProperties, type PropsWithChildren, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Card, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type DndTileData } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { type GridConstraints, type GridItem, applyConstraints } from './engine';
import { cellRect } from './geometry';
import { useGridContext } from './Grid';

type DragState = 'idle' | 'dragging';

const GRID_CELL_NAME = 'Grid.Cell';

export type GridCellProps<T extends Type.AnyObj = any> = ThemedClassName<
  PropsWithChildren<{
    item: T;
    /** This item's current position/size in grid cells (an entry of `GridLayout.items`). */
    layout: GridItem;
    draggable?: boolean;
    /** Resize bounds in cells; enforced when the user drags the resize handle. */
    constraints?: GridConstraints;
  }>
>;

/**
 * A single draggable, resizable tile positioned by absolute pixel rect derived from its grid cell.
 * Movement is resolved by the `Grid.Root` container handler (registered with `Dnd.Root`); this
 * component only originates the drag. Resize is a local pointer-delta gesture (not a Dnd tile drag)
 * that snaps to cell size and calls `onResize` from context on drop.
 */
export const GridCell = ({
  classNames,
  children,
  item,
  layout,
  draggable: isDraggable,
  constraints,
}: GridCellProps) => {
  const { t } = useTranslation(translationKey);
  const { cellSize, gap, containerId, readonly, onResize } = useGridContext(GRID_CELL_NAME);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const resizeHandleRef = useRef<HTMLButtonElement | null>(null);
  const [dragState, setDragState] = useState<DragState>('idle');
  // The native drag preview follows the cursor; captured at the source's px size so it can't rescale.
  const [preview, setPreview] = useState<{ container: HTMLElement; width: number; height: number } | null>(null);
  // Live resize outline (px) shown while dragging the resize handle; the tile itself only resizes on release.
  const [resizeGhost, setResizeGhost] = useState<{ width: number; height: number } | null>(null);

  // Move: originate a Dnd tile drag; the actual move is applied by Grid.Root's container handler.
  useEffect(() => {
    invariant(rootRef.current);
    invariant(dragHandleRef.current);
    return draggable({
      element: rootRef.current,
      dragHandle: dragHandleRef.current,
      canDrag: () => isDraggable !== false && !readonly,
      getInitialData: () =>
        ({
          type: 'tile',
          containerId,
          id: item.id,
          data: item,
          location: { x: layout.x, y: layout.y },
        }) satisfies DndTileData,
      // Render a custom preview sized to the source tile so the dragged image keeps the tile's exact
      // dimensions (the native preview rescales on high-DPI displays, making the tile appear larger).
      onGenerateDragPreview: ({ location, nativeSetDragImage }) => {
        const element = rootRef.current;
        invariant(element);
        const bounds = element.getBoundingClientRect();
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: preserveOffsetOnSource({ element, input: location.current.input }),
          render: ({ container }) => {
            setPreview({ container, width: bounds.width, height: bounds.height });
            return () => setPreview(null);
          },
        });
      },
      onDragStart: () => {
        setDragState('dragging');
      },
      onDrop: () => {
        setDragState('idle');
      },
    });
  }, [isDraggable, readonly, containerId, item, layout.x, layout.y]);

  // Resize: a plain pointer-delta drag (not a Dnd tile) on a corner handle; snaps to whole cells and
  // commits via `onResize` (which routes through `engine.resizeItem`) on drop.
  useEffect(() => {
    if (!resizeHandleRef.current || readonly) {
      return;
    }

    // Outline size at the start of the gesture, in px.
    const base = cellRect(layout, cellSize, gap);
    return draggable({
      element: resizeHandleRef.current,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        disableNativeDragPreview({ nativeSetDragImage });
        preventUnhandled.start();
      },
      onDragStart: () => {
        setResizeGhost({ width: base.width, height: base.height });
      },
      onDrag: ({ location }) => {
        const dx = location.current.input.clientX - location.initial.input.clientX;
        const dy = location.current.input.clientY - location.initial.input.clientY;
        // Raw (unsnapped) outline following the cursor, floored at one cell so it never collapses;
        // snapping to whole cells happens only on drop.
        setResizeGhost({
          width: Math.max(cellSize.width, base.width + dx),
          height: Math.max(cellSize.height, base.height + dy),
        });
      },
      onDrop: ({ location }) => {
        setResizeGhost(null);
        onResize(item.id, nextSize(layout, cellSize, gap, location, constraints), constraints);
      },
    });
  }, [readonly, layout, cellSize, gap, item.id, constraints, onResize]);

  const rect = cellRect(layout, cellSize, gap);

  return (
    <>
      <Card.Root
        classNames={mx(
          'absolute grid-rows-[auto_1fr]',
          // While dragging, drop pointer events so the backdrop cells beneath the (large) source
          // footprint receive the drag — otherwise a tile can't be dropped back onto its own area.
          dragState === 'dragging' && 'opacity-50 pointer-events-none',
          classNames,
        )}
        style={{ ...rect, ...sizeOverride }}
        ref={rootRef}
      >
        <Card.Header>
          <Card.DragHandle ref={dragHandleRef} />
          {children}
        </Card.Header>
        {!readonly && (
          <button
            ref={resizeHandleRef}
            type='button'
            aria-label={t('resize-object.button')}
            className='absolute bottom-0 right-0 size-4 cursor-nwse-resize touch-none opacity-0 transition-opacity duration-300 hover:opacity-100'
          />
        )}
      </Card.Root>

      {/* Resize outline: previews the target size while dragging the handle; the tile snaps to whole
          cells only on release (see the resize draggable's onDrop). */}
      {resizeGhost && (
        <div
          className='pointer-events-none absolute z-10 rounded-lg ring-2 ring-accent-bg'
          style={{ left: rect.left, top: rect.top, width: resizeGhost.width, height: resizeGhost.height }}
        />
      )}

      {/* Drag preview: a same-sized clone following the cursor (see onGenerateDragPreview). */}
      {preview &&
        createPortal(
          <Card.Root
            classNames={mx('grid-rows-[auto_1fr]', classNames)}
            style={{ width: preview.width, height: preview.height, ...sizeOverride }}
          >
            <Card.Header>
              <Card.DragHandle />
              {children}
            </Card.Header>
          </Card.Root>,
          preview.container,
        )}
    </>
  );
};

// The grid controls tile size via an explicit px rect; neutralize `Card.Root`'s readable-width
// (min/max inline-size) and min-height defaults so a multi-cell tile isn't clamped to a single card.
const sizeOverride: CSSProperties = {
  minInlineSize: 0,
  maxInlineSize: 'none',
  minBlockSize: 0,
  maxBlockSize: 'none',
};

GridCell.displayName = GRID_CELL_NAME;

/** Pointer delta (px) since drag start, converted to a whole-cell size delta and clamped to constraints. */
const nextSize = (
  layout: GridItem,
  cellSize: { width: number; height: number },
  gap: number,
  location: DragLocationHistory,
  constraints: GridConstraints | undefined,
): { w: number; h: number } => {
  const dx = location.current.input.clientX - location.initial.input.clientX;
  const dy = location.current.input.clientY - location.initial.input.clientY;
  const deltaW = Math.round(dx / (cellSize.width + gap));
  const deltaH = Math.round(dy / (cellSize.height + gap));
  return applyConstraints({ w: layout.w + deltaW, h: layout.h + deltaH }, constraints);
};
