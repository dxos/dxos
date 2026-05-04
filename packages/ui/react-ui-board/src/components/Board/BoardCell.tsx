//
// Copyright 2025 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { type Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Card } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '#translations';

import { useBoardContext } from './Board';
import { getBoardRect } from './geometry';
import { type CellLayout, type Position } from './types';

type DragState = 'idle' | 'dragging';

const BOARD_CELL_NAME = 'Board.Cell';

export type BoardCellProps<T extends Type.AnyObj = any> = ThemedClassName<
  PropsWithChildren<{
    item: T;
    layout: CellLayout;
    draggable?: boolean;
  }>
>;

// TODO(burdon): Reconcile with Mosaic.Tile.
export const BoardCell = ({ classNames, children, item, layout, draggable: isDraggable }: BoardCellProps) => {
  const { t } = useTranslation(translationKey);
  const { grid: board, zoom, onSelect, onDelete, onMove } = useBoardContext(BOARD_CELL_NAME);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragHandleRef = useRef<HTMLButtonElement | null>(null);
  const [dragState, setDragState] = useState<DragState>('idle');
  useEffect(() => {
    invariant(rootRef.current);
    invariant(dragHandleRef.current);
    return draggable({
      element: rootRef.current,
      dragHandle: dragHandleRef.current,
      canDrag: () => isDraggable !== false && !zoom,
      onDragStart: () => {
        // TODO(burdon): Change border of preview to outline while dragging.
        setDragState('dragging');
      },
      onDrop: ({
        location: {
          current: { dropTargets },
        },
      }) => {
        setDragState('idle');
        const position = dropTargets[0]?.data.position as Position;
        if (position) {
          onMove?.(item.id, position);
        }
      },
    });
  }, [isDraggable, zoom]);

  return (
    <Card.Root
      ref={rootRef}
      classNames={mx(
        // Card.Root is flex-col; stretching the inner Column.Root to fill the cell
        // and giving the surface row 1fr keeps the card from leaving a blank row at the bottom.
        'absolute p-0 [&>.dx-column-root]:grow [&>.dx-column-root]:[grid-auto-rows:min-content] [&>.dx-column-root]:[align-content:space-between]',
        dragState === 'dragging' && 'opacity-50',
        classNames,
      )}
      style={getBoardRect(board, layout)}
      onClick={() => onSelect?.(item.id)}
    >
      <Card.Toolbar>
        <Card.DragHandle ref={dragHandleRef} />
        {/* TODO(burdon): Title. */}
        <Card.ToolbarSeparator variant='gap' />
        {dragState !== 'dragging' && (
          <Card.ToolbarIconButton
            variant='ghost'
            icon='ph--x--regular'
            iconOnly
            label={t('delete-object.button')}
            onClick={() => onDelete?.(item.id)}
          />
        )}
      </Card.Toolbar>
      {/* `contents` keeps the surface output participating in Card.Root's Column grid so col-span/subgrid classes resolve. */}
      <div role='none' {...{ inert: true }} className='contents pointer-events-none'>
        {children}
      </div>
    </Card.Root>
  );
};

BoardCell.displayName = BOARD_CELL_NAME;
