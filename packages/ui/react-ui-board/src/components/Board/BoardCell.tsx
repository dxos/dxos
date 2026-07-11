//
// Copyright 2026 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preserveOffsetOnSource } from '@atlaskit/pragmatic-drag-and-drop/element/preserve-offset-on-source';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import React, { type CSSProperties, type PropsWithChildren, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { type Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Card, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { type DndTileData, useDndRootContext } from '@dxos/react-ui-dnd';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { useBoardContext } from './Board';
import { type GridConstraints, type GridPosition, applyConstraints } from './engine';
import { cellRect } from './geometry';

type DragState = 'idle' | 'dragging';

const BOARD_CELL_NAME = 'Board.Cell';

export type BoardCellProps<T extends Type.AnyObj = Type.AnyObj> = ThemedClassName<
  PropsWithChildren<{
    item: T;
    /** This item's current position/size in grid cells (its entry in the board layout). */
    layout: GridPosition;
    /** Rendered in the header row next to the drag handle. */
    title?: ReactNode;
    draggable?: boolean;
    /** Resize bounds in cells; enforced when the user drags the resize handle. */
    constraints?: GridConstraints;
  }>
>;

/**
 * A single draggable, resizable tile positioned by absolute pixel rect derived from its grid cell.
 * Movement is resolved by the `Board.Root` container handler (registered with `Dnd.Root`); this
 * component only originates the drag. Resize is a local pointer-delta gesture (not a Dnd tile drag)
 * that snaps to cell size and calls `onResize` from context on drop.
 */
export const BoardCell = ({
  classNames,
  children,
  item,
  layout,
  title,
  draggable: isDraggable,
  constraints,
}: BoardCellProps) => {
  const { t } = useTranslation(translationKey);
  const {
    cellSize,
    gap,
    columns,
    zoom,
    selectionMode,
    selected,
    toggleSelection,
    containerId,
    readonly,
    onResize,
    onResizePreview,
    onDelete,
    previewLayout,
    viewportRef,
  } = useBoardContext(BOARD_CELL_NAME);
  const selectable = !!selectionMode;
  const isSelected = selectable && selected.has(item.id);
  // Any active drag makes every tile transparent to pointer events so the backdrop drop-target cells
  // beneath them (incl. cells under an occupied tile) receive the drag — required for push-on-drop.
  const { dragging } = useDndRootContext(BOARD_CELL_NAME);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const resizeHandleRef = useRef<HTMLButtonElement | null>(null);
  const [dragState, setDragState] = useState<DragState>('idle');
  // The native drag preview follows the cursor; captured at the source's px size so it can't rescale.
  const [preview, setPreview] = useState<{ container: HTMLElement; width: number; height: number } | null>(null);
  // Live resize outline (px) shown while dragging the resize handle; the tile itself only resizes on release.
  const [resizeGhost, setResizeGhost] = useState<{ width: number; height: number } | null>(null);
  // Last pointer position during a resize, so the outline can be recomputed on scroll (no pointer move).
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  // Move: originate a Dnd tile drag; the actual move is applied by Board.Root's container handler.
  useEffect(() => {
    invariant(rootRef.current);
    invariant(dragHandleRef.current);
    return draggable({
      element: rootRef.current,
      dragHandle: dragHandleRef.current,
      canDrag: () => isDraggable !== false && !readonly && zoom >= 1,
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
  }, [isDraggable, readonly, zoom, containerId, item, layout.x, layout.y]);

  // Hide the drag handle while this tile is being dragged, toggling the element's visibility directly
  // (no wrapper) so the header grid layout is untouched and the drag stays bound to the handle.
  useEffect(() => {
    const handle = dragHandleRef.current;
    if (handle) {
      handle.style.visibility = dragState === 'dragging' ? 'hidden' : '';
    }
  }, [dragState]);

  // Hide the resize corner during a move (`dragging`) or an in-progress resize (`resizeGhost`) by
  // toggling visibility only. The handle must stay MOUNTED — the resize draggable binds to it once and
  // isn't re-created when a move ends, so unmounting it (e.g. `!dragging` in JSX) would leave a
  // re-appeared handle with no drag binding.
  useEffect(() => {
    const handle = resizeHandleRef.current;
    if (handle) {
      handle.style.visibility = dragging || resizeGhost || zoom < 1 ? 'hidden' : '';
    }
  }, [dragging, resizeGhost, zoom]);

  // Resize: a plain pointer drag (not a Dnd tile) on a corner handle. The size is derived from the
  // LIVE positions of the tile and the pointer (both viewport coords via getBoundingClientRect), so
  // auto-scroll is accounted for automatically — a `scroll` listener recomputes while scrolling even
  // without pointer movement. The outline magnetizes to whole cells; the final snap happens on drop.
  useEffect(() => {
    const handle = resizeHandleRef.current;
    const viewport = viewportRef.current;
    if (!handle || readonly || zoom < 1) {
      return;
    }

    // Raw px extent from the tile's top-left corner to the pointer, floored at one cell.
    const rawSize = () => {
      const el = rootRef.current;
      const pointer = lastPointer.current;
      if (!el || !pointer) {
        return null;
      }
      const tile = el.getBoundingClientRect();
      return {
        width: Math.max(cellSize.width, pointer.x - tile.left),
        height: Math.max(cellSize.height, pointer.y - tile.top),
      };
    };
    // Raw px → constrained whole-cell size. Width is capped to the space remaining to the right edge
    // so growing a tile at the edge caps its width rather than shifting it left (which the resolver's
    // clamp would otherwise do).
    const cellsFor = (raw: { width: number; height: number }) => {
      const size = applyConstraints(
        {
          w: Math.max(1, Math.round((raw.width + gap) / (cellSize.width + gap))),
          h: Math.max(1, Math.round((raw.height + gap) / (cellSize.height + gap))),
        },
        constraints,
      );
      return { w: Math.min(size.w, Math.max(1, columns - layout.x)), h: size.h };
    };
    // Update the free (magnetic) outline AND report the snapped size so the engine runs live and the
    // other tiles move out of the way during the resize — the same behaviour as a move.
    const update = () => {
      const raw = rawSize();
      if (raw) {
        setResizeGhost({
          width: magnetize(raw.width, cellSize.width, gap),
          height: magnetize(raw.height, cellSize.height, gap),
        });
        onResizePreview(item.id, cellsFor(raw));
      }
    };

    const cleanup = draggable({
      element: handle,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        disableNativeDragPreview({ nativeSetDragImage });
        preventUnhandled.start();
      },
      onDragStart: ({ location }) => {
        lastPointer.current = { x: location.current.input.clientX, y: location.current.input.clientY };
        viewport?.addEventListener('scroll', update);
        update();
      },
      onDrag: ({ location }) => {
        lastPointer.current = { x: location.current.input.clientX, y: location.current.input.clientY };
        update();
      },
      onDrop: () => {
        viewport?.removeEventListener('scroll', update);
        const raw = rawSize();
        setResizeGhost(null);
        lastPointer.current = null;
        onResizePreview(item.id, null);
        if (raw) {
          onResize(item.id, cellsFor(raw), constraints);
        }
      },
    });

    return () => {
      viewport?.removeEventListener('scroll', update);
      onResizePreview(item.id, null);
      cleanup();
    };
  }, [readonly, zoom, cellSize, gap, columns, layout.x, item.id, constraints, onResize, onResizePreview, viewportRef]);

  // Non-dragged tiles render at their previewed position during a drag (animating out of the way),
  // and spring back to `layout` when the drag ends. The dragged tile itself stays put (its preview
  // clone follows the cursor), so it uses its committed layout.
  // Every tile — including the one being dragged — renders at its previewed position so it glides
  // to where it will land (cell-to-cell) during the drag and is already there on drop, rather than
  // snapping back from its original cell. The cursor-following clone is the "picked up" copy.
  const effectiveLayout = previewLayout ? (previewLayout.items[item.id] ?? layout) : layout;
  const rect = cellRect(span(effectiveLayout), cellSize, gap);

  // While this tile is dragged, outline the FULL w×h footprint it will occupy at the target cell
  // (not just the 1x1 cell under the cursor) so the landing area reads as one blue-bordered region.
  const moveTarget =
    dragging && dragging.source.data.id === item.id && dragging.target?.data.type === 'placeholder'
      ? dragging.target.data.location
      : undefined;
  const moveGhost = moveTarget
    ? cellRect({ x: moveTarget.x, y: moveTarget.y, w: layout.w ?? 1, h: layout.h ?? 1 }, cellSize, gap)
    : undefined;

  return (
    <>
      <Card.Root
        classNames={mx(
          'absolute grid-rows-[auto_1fr]',
          // Animate position/size changes so displaced tiles glide out of the way (and spring back),
          // and a resized tile grows smoothly.
          'transition-[left,top,width,height] duration-200 ease-out',
          dragState === 'dragging' && 'opacity-50',
          // Transparent to pointer events during ANY drag so a tile can be dropped onto an occupied
          // cell (pushing the occupant) or back onto its own footprint.
          !!dragging && 'pointer-events-none',
          // Selection is shown as the accent (blue) ring — same as the drag/resize ghost outline.
          selectable && 'cursor-pointer',
          isSelected && 'ring-2 ring-accent-bg',
          classNames,
        )}
        style={{ ...rect, ...sizeOverride }}
        ref={rootRef}
        aria-selected={selectable ? isSelected : undefined}
        onClick={selectable ? (event) => toggleSelection(item.id, event.shiftKey) : undefined}
      >
        <Card.Header>
          <Card.DragHandle ref={dragHandleRef} />
          {title}
          {onDelete && (
            <Card.Block end>
              <IconButton
                variant='ghost'
                icon='ph--x--regular'
                iconOnly
                label={t('delete-object.button')}
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(item.id);
                }}
              />
            </Card.Block>
          )}
        </Card.Header>
        {/* Body spans all of the card's column tracks (it has gutter columns) so content — e.g. a
            poster image — fills the full tile width, not just the first gutter track. */}
        {children && <div className='relative col-[1/-1] min-h-0 overflow-hidden'>{children}</div>}
      </Card.Root>

      {/* Resize handle: a sibling (not clipped by the card's overflow/rounding) straddling the
          bottom-right corner so the resize cursor appears right at the tile's edge. Always mounted
          (its drag binding must persist); hidden via visibility during move/resize (see effect). */}
      {!readonly && (
        <button
          ref={resizeHandleRef}
          type='button'
          aria-label={t('resize-object.button')}
          className='group/resize absolute z-20 size-6 cursor-nwse-resize touch-none'
          style={{ left: rect.left + rect.width - 12, top: rect.top + rect.height - 12 }}
        >
          <span className='absolute bottom-1.5 right-1.5 size-2 border-separator opacity-50 transition-opacity border-b-2 border-r-2 group-hover/resize:opacity-100' />
        </button>
      )}

      {/* Move outline: the full footprint the tile will occupy at the target cell. */}
      {moveGhost && (
        <div className='pointer-events-none absolute z-10 rounded-sm ring-2 ring-accent-bg' style={moveGhost} />
      )}

      {/* Resize outline: previews the target size while dragging the handle; the tile snaps to whole
          cells only on release (see the resize draggable's onDrop). */}
      {resizeGhost && (
        <div
          className='pointer-events-none absolute z-10 rounded-sm ring-2 ring-accent-bg'
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
              {title}
            </Card.Header>
            {children && <div className='relative col-[1/-1] min-h-0 overflow-hidden'>{children}</div>}
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

BoardCell.displayName = BOARD_CELL_NAME;

// Resolve a position's optional span to a concrete w×h rect for geometry.
const span = (position: GridPosition): { x: number; y: number; w: number; h: number } => ({
  x: position.x,
  y: position.y,
  w: position.w ?? 1,
  h: position.h ?? 1,
});

/**
 * Pull a raw px extent to the nearest whole-cell extent only when it comes within `snapPx` of it,
 * otherwise leave it free — a light "magnetic to the grid" pull near cell boundaries.
 */
const magnetize = (raw: number, cell: number, gap: number, snapPx = 16): number => {
  const pitch = cell + gap;
  const cells = Math.max(1, Math.round((raw + gap) / pitch));
  const snapped = cells * cell + (cells - 1) * gap;
  return Math.abs(raw - snapped) <= snapPx ? snapped : raw;
};
