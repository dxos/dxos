//
// Copyright 2025 DXOS.org
//

import React, { FC, forwardRef, useState } from 'react';

import type { Obj } from '@dxos/echo';
import { Board, type MosaicTileProps, useBoard } from '@dxos/react-ui-mosaic';

import { useKanbanItemEventHandler } from '#hooks';
import { type ColumnStructure, UNCATEGORIZED_VALUE } from '#types';

import { type KanbanColumnProps, useKanbanBoard } from './context';

export { type KanbanColumnProps };

const KANBAN_COLUMN_NAME = 'KanbanBoard.Column';

/**
 * Mosaic Tile for Kanban column.
 */
export const KanbanColumn = forwardRef<HTMLDivElement, KanbanColumnProps>(
  ({ data: column, location, debug, draggable }, forwardedRef) => {
    const { model } = useBoard<ColumnStructure, Obj.Unknown>(KANBAN_COLUMN_NAME);
    const { columnFieldPath, change, onCardAdd, getPivotAttributes, itemTile } = useKanbanBoard(KANBAN_COLUMN_NAME);

    const { title } = getPivotAttributes(column.columnValue);
    const uncategorized = column.columnValue === UNCATEGORIZED_VALUE;
    const [dragHandle, setDragHandle] = useState<HTMLButtonElement | null>(null);

    const eventHandler = useKanbanItemEventHandler({
      column,
      columnFieldPath,
      model,
      change,
    });

    return (
      <Board.Column.Root
        data={column}
        location={location}
        classNames='grid grid-rows-[var(--dx-rail-action)_1fr_var(--dx-rail-action)]'
        debug={debug}
        draggable={draggable}
        dragHandle={dragHandle}
        ref={forwardedRef}
      >
        {uncategorized ? (
          <div className='border-b border-separator p-2' data-testid='board-column-header'>
            <span className='font-medium'>{title}</span>
          </div>
        ) : (
          <Board.Column.Header label={title} dragHandleRef={setDragHandle} />
        )}
        <Board.Column.Body
          data={column}
          eventHandler={eventHandler}
          Tile={itemTile as FC<MosaicTileProps<Obj.Unknown>>}
        />
        <Board.Column.Footer
          onAdd={
            onCardAdd
              ? () => onCardAdd(column.columnValue === UNCATEGORIZED_VALUE ? undefined : column.columnValue)
              : undefined
          }
        />
      </Board.Column.Root>
    );
  },
);

KanbanColumn.displayName = KANBAN_COLUMN_NAME;
