//
// Copyright 2026 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import { preventUnhandled } from '@atlaskit/pragmatic-drag-and-drop/prevent-unhandled';
import { type DragLocationHistory } from '@atlaskit/pragmatic-drag-and-drop/types';
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';

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
  const [previewSize, setPreviewSize] = useState<{ w: number; h: number } | null>(null);

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

    return draggable({
      element: resizeHandleRef.current,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        disableNativeDragPreview({ nativeSetDragImage });
        preventUnhandled.start();
      },
      onDragStart: () => {
        setPreviewSize({ w: layout.w, h: layout.h });
      },
      onDrag: ({ location }) => {
        setPreviewSize(nextSize(layout, cellSize, gap, location, constraints));
      },
      onDrop: ({ location }) => {
        const size = nextSize(layout, cellSize, gap, location, constraints);
        setPreviewSize(null);
        onResize(item.id, size, constraints);
      },
    });
  }, [readonly, layout.w, layout.h, cellSize, gap, item.id, constraints, onResize]);

  const rect = cellRect({ ...layout, ...previewSize }, cellSize, gap);

  return (
    <Card.Root
      classNames={mx('absolute grid-rows-[auto_1fr]', dragState === 'dragging' && 'opacity-50', classNames)}
      style={rect}
      ref={rootRef}
    >
      <Card.Header>
        <Card.DragHandle ref={dragHandleRef} />
      </Card.Header>
      {children}
      {!readonly && (
        <button
          ref={resizeHandleRef}
          type='button'
          aria-label={t('resize-object.button')}
          className='absolute bottom-0 right-0 size-4 cursor-nwse-resize touch-none opacity-0 transition-opacity duration-300 hover:opacity-100'
        />
      )}
    </Card.Root>
  );
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
