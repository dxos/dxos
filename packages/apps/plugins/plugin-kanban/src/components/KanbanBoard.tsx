//
// Copyright 2023 DXOS.org
//

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  Modifier,
  MouseSensor,
  useSensor,
} from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import React, { FC, useCallback, useEffect, useState } from 'react';

import { subscribe } from '@dxos/observable-object';
import { arrayMove } from '@dxos/util';

import type { KanbanColumn, KanbanColumns, KanbanItem } from '../props';
import { KanbanColumnComponent, KanbanColumnComponentPlaceholder } from './KanbanColumn';
import { KanbanItemComponent } from './KanbanItem';

// TODO(burdon): Touch sensors.
// TODO(burdon): Prevent browser nav back when swiping left/right.
// TODO(burdon): Snap scroll (see kai).

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

  const [activeColumn, setActiveColumn] = useState<KanbanColumn | null>(null);
  const [activeItem, setActiveItem] = useState<KanbanItem | null>(null);

  // TODO(burdon): Different sensor based on column/item.
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  // TODO(burdon): Tentatively insert into new column when dragging over without causing mutation.
  const handleDragOver = ({ active, over }: DragOverEvent) => {
    console.log('over', String(active.id).slice(0, 9), String(over?.id).slice(0, 9));
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    columns.forEach((column) => {
      if (column.id === active.id) {
        setActiveColumn(column);
      } else {
        const item = column.items.find((item) => item.id === active.id);
        if (item) {
          setActiveItem(item);
        }
      }
    });
  };

  const handleDragCancel = () => {
    setActiveColumn(null);
    setActiveItem(null);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      switch ((active.data.current as any).type) {
        case 'column': {
          const oldIndex = columns.findIndex((column) => column.id === active.id);
          const newIndex = columns.findIndex((column) => column.id === over?.id);
          arrayMove(columns, oldIndex, newIndex);
          break;
        }

        // TODO(burdon): Handle drag to other column.
        case 'item': {
          const column = (active.data.current as any).column as KanbanColumn;
          const oldIndex = column.items.findIndex((item) => item.id === active.id);
          const newIndex = column.items.findIndex((item) => item.id === over?.id);
          arrayMove(column.items, oldIndex, newIndex);
        }
      }
    }

    setActiveColumn(null);
    setActiveItem(null);
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

  const customModifier: Modifier = ({ transform }) => {
    if (activeColumn) {
      return {
        ...transform,
        y: 0,
      };
    } else {
      return transform;
    }
  };

  return (
    <div className='flex overflow-x-scroll p-4 space-x-4'>
      <div className='flex space-x-4'>
        <DndContext
          // TODO(burdon): Custom CollisionDetection.
          // collisionDetection={closestCenter}
          // sensors={[mouseSensor]}
          modifiers={[customModifier]}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
        >
          <SortableContext strategy={horizontalListSortingStrategy} items={columns?.map(({ id }) => id)}>
            {columns.map((column) => (
              <KanbanColumnComponent
                key={column.id}
                column={column}
                // active={activeItem ? { item: activeItem } : undefined}
                onAdd={onAddItem}
                onDelete={() => handleDeleteColumn(column.id)}
              />
            ))}
          </SortableContext>

          {/* Overlay required to drag across columns. */}
          {activeItem && (
            <DragOverlay style={{ margin: 0 }}>
              <KanbanItemComponent item={activeItem} onDelete={() => {}} />
            </DragOverlay>
          )}
        </DndContext>

        {handleAddColumn && <KanbanColumnComponentPlaceholder onAdd={handleAddColumn} />}
      </div>
    </div>
  );
};
