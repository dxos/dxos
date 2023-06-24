//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent, MouseSensor, useSensor } from '@dnd-kit/core';
import React, { FC, useCallback, useEffect, useState } from 'react';

import { ObservableArray, subscribe } from '@dxos/observable-object';
import { arrayMove } from '@dxos/util';

import { KanbanColumns, KanbanItem } from '../props';
import { KanbanColumnComponent, KanbanColumnComponentPlaceholder } from './KanbanColumn';

// TODO(burdon): Consistently use FC?
export const KanbanBoard: FC<{ columns: KanbanColumns }> = ({ columns }) => {
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

  const handleDragOver = () => {
    console.log('!!!');
  };

  const handleAddColumn = () => {
    columns.splice(columns.length, 0, {
      id: 'column-' + Math.random(),
      title: 'Column ' + (columns.length + 1),
      items: new ObservableArray<KanbanItem>(),
    });
  };

  const handleDeleteColumn = (id: string) => {
    const index = columns.findIndex((column) => column.id === id);
    if (index >= 0) {
      columns.splice(index, 1);
    }
  };

  return (
    <div className='flex p-4 overflow-x-scroll space-x-4'>
      <div className='flex space-x-4'>
        <DndContext
          /* modifiers={[restrictToHorizontalAxis]} */ sensors={[mouseSensor]}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          {/* <SortableContext strategy={horizontalListSortingStrategy} items={columns?.map((column) => column.id) ?? []}> */}
          {columns.map((column) => (
            <KanbanColumnComponent key={column.id} column={column} onDelete={() => handleDeleteColumn(column.id)} />
          ))}
          {/* </SortableContext> */}
        </DndContext>

        <KanbanColumnComponentPlaceholder onAdd={handleAddColumn} />
      </div>
    </div>
  );
};
