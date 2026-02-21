//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useRef } from 'react';

import type { Obj } from '@dxos/echo';
import { IconButton, useTranslation } from '@dxos/react-ui';
import { Board, type MosaicTileProps, useBoard } from '@dxos/react-ui-mosaic';

import { useKanbanItemEventHandler } from '../hooks';
import { meta } from '../meta';
import { type ColumnStructure, UNCATEGORIZED_VALUE } from '../types';

import { useKanbanBoard } from './KanbanBoard';

const KANBAN_COLUMN_NAME = 'KanbanBoard.Column';

/** Column tile; items are Obj.Unknown from Echo. */
export type KanbanColumnProps = Pick<MosaicTileProps<ColumnStructure>, 'classNames' | 'location' | 'data' | 'debug'>;

export const KanbanColumn = forwardRef<HTMLDivElement, KanbanColumnProps>(
  ({ data: column, location, classNames, debug }, forwardedRef) => {
    const { t } = useTranslation(meta.id);
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
        classNames={classNames}
        debug={debug}
        dragHandleRef={dragHandleRef}
        ref={forwardedRef}
      >
        <div
          role='none'
          data-testid='board-column'
          className='group/column grid bs-full overflow-hidden grid-rows-[var(--rail-action)_1fr_var(--rail-action)]'
        >
          {uncategorized ? (
            <div className='border-be border-separator p-2' data-testid='board-column-header'>
              <span className='font-medium'>{title}</span>
            </div>
          ) : (
            <Board.Column.Header
              classNames='border-be border-separator'
              label={title}
              dragHandleRef={dragHandleRef as React.RefObject<HTMLButtonElement>}
            />
          )}
          <Board.Column.Body
            data={column}
            eventHandler={eventHandler}
            Tile={itemTile as React.FC<MosaicTileProps<Obj.Unknown>>}
          />
          {onCardAdd && (
            <div
              role='none'
              className='rounded-b-sm border-bs border-separator p-1'
              data-testid='board-column-add-item'
            >
              <IconButton
                icon='ph--plus--regular'
                iconOnly
                label={t('add card label')}
                classNames='is-full'
                onClick={() => onCardAdd(column.columnValue === UNCATEGORIZED_VALUE ? undefined : column.columnValue)}
              />
            </div>
          )}
        </div>
      </Board.Column.Root>
    );
  },
);

KanbanColumn.displayName = KANBAN_COLUMN_NAME;
