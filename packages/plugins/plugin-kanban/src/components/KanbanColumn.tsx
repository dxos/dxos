//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useRef } from 'react';

import type { Obj } from '@dxos/echo';
import { Board, type MosaicTileProps, useBoard } from '@dxos/react-ui-mosaic';

import { useKanbanItemEventHandler } from '../hooks';
import { type ColumnStructure, UNCATEGORIZED_VALUE } from '../types';

import { useKanbanBoard } from './KanbanBoard';

const KANBAN_COLUMN_NAME = 'KanbanBoard.Column';

/**
 * Column tile.
 * Items are Obj.Unknown from Echo.
 */
export type KanbanColumnProps = Pick<MosaicTileProps<ColumnStructure>, 'location' | 'data' | 'debug'>;

export const KanbanColumn = forwardRef<HTMLDivElement, KanbanColumnProps>(
  ({ data: column, location, debug }, forwardedRef) => {
    const { model } = useBoard<ColumnStructure, Obj.Unknown>(KANBAN_COLUMN_NAME);
    const { columnFieldPath, change, onCardAdd, getPivotAttributes, itemTile } = useKanbanBoard(KANBAN_COLUMN_NAME);

    const { title } = getPivotAttributes(column.columnValue);
    const uncategorized = column.columnValue === UNCATEGORIZED_VALUE;
    const dragHandleRef = useRef<HTMLButtonElement | null>(null);

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
        debug={debug}
        dragHandleRef={dragHandleRef}
        ref={forwardedRef}
      >
        <Board.Column.Grid classNames='grid-rows-[var(--rail-action)_1fr_var(--rail-action)]'>
          {uncategorized ? (
            <div className='border-be border-separator p-2' data-testid='board-column-header'>
              <span className='font-medium'>{title}</span>
            </div>
          ) : (
            <Board.Column.Header label={title} dragHandleRef={dragHandleRef as React.RefObject<HTMLButtonElement>} />
          )}
          <Board.Column.Body
            data={column}
            eventHandler={eventHandler}
            Tile={itemTile as React.FC<MosaicTileProps<Obj.Unknown>>}
          />
          {onCardAdd && (
            <Board.Column.Footer
              onAdd={() => onCardAdd(column.columnValue === UNCATEGORIZED_VALUE ? undefined : column.columnValue)}
            />
          )}
        </Board.Column.Grid>
      </Board.Column.Root>
    );
  },
);

KanbanColumn.displayName = KANBAN_COLUMN_NAME;
