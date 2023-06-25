//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent, MouseSensor, useSensor } from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import React, { FC, useCallback, useEffect, useState } from 'react';

import { subscribe } from '@dxos/observable-object';
import { arrayMove } from '@dxos/util';

import { KanbanColumn, KanbanColumns, KanbanItem } from '../props';
import { KanbanColumnComponent, KanbanColumnComponentPlaceholder } from './KanbanColumn';

// TODO(burdon): Touch sensors.

// TODO(burdon): Consistently use FC?
export const KanbanBoard: FC<{
  columns: KanbanColumns;
  onAddColumn?: () => KanbanColumn;
  onAddItem?: (column: KanbanColumn) => KanbanItem;
}> = ({ columns, onAddColumn, onAddItem }) => {
  const [_, setIter] = useState([]);
  useEffect(() => {
    // TODO(burdon): Copying from Stack. Create custom hook?
    return columns[subscribe](() => setIter([])) as () => void;
  }, []);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 16,
    },
  });

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = columns.findIndex((column) => column.id === active.id);
      const newIndex = columns.findIndex((column) => column.id === over?.id);
      arrayMove(columns, oldIndex, newIndex);
    }
  }, []);

  const handleAddColumn = onAddColumn
    ? () => {
        const column = onAddColumn();
        columns.splice(columns.length, 0, column);
      }
    : undefined;

  const handleDeleteColumn = (id: string) => {
    const index = columns.findIndex((column) => column.id === id);
    if (index >= 0) {
      columns.splice(index, 1);
    }
  };

  return (
    <div className='flex p-4 overflow-x-scroll space-x-4'>
      <div className='flex space-x-4'>
        <DndContext modifiers={[restrictToHorizontalAxis]} sensors={[mouseSensor]} onDragEnd={handleDragEnd}>
          <SortableContext strategy={horizontalListSortingStrategy} items={columns?.map((column) => column.id) ?? []}>
            {columns.map((column) => (
              <KanbanColumnComponent
                key={column.id}
                column={column}
                onAdd={onAddItem}
                onDelete={() => handleDeleteColumn(column.id)}
              />
            ))}
          </SortableContext>
        </DndContext>

        {handleAddColumn && <KanbanColumnComponentPlaceholder onAdd={handleAddColumn} />}
      </div>
    </div>
  );
};
