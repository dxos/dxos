//
// Copyright 2023 DXOS.org
//

import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  Modifier,
  MouseSensor,
  useSensor,
} from '@dnd-kit/core';
import { horizontalListSortingStrategy, SortableContext } from '@dnd-kit/sortable';
import React, { FC, useEffect, useState } from 'react';

import { createSubscription } from '@dxos/observable-object';
import { arrayMove } from '@dxos/util';

import { findLocation, Location } from '../props';
import type { KanbanColumnModel, KanbanModel, KanbanItem } from '../props';
import { ItemsMapper, KanbanColumnComponent, KanbanColumnComponentPlaceholder } from './KanbanColumn';
import { KanbanItemComponent } from './KanbanItem';

// TODO(burdon): Touch sensors.
// TODO(burdon): Prevent browser nav back when swiping left/right.
// TODO(burdon): Consistently use FC?
export const KanbanBoard: FC<{
  model: KanbanModel;
  onAddColumn?: () => KanbanColumnModel;
  onAddItem?: (column: KanbanColumnModel) => KanbanItem;
}> = ({ model, onAddColumn, onAddItem }) => {
  // TODO(burdon): Copying from Stack. Create custom hook?
  const [_, setIter] = useState([]);
  useEffect(() => {
    const handle = createSubscription(() => setIter([]));
    handle.update([model.columns]);
    return () => handle.unsubscribe();
  }, []);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  // Dragging column.
  // TODO(burdon): Dragging column causes flickering when dragging left to first column.
  const [draggingColumn, setDraggingColumn] = useState<KanbanColumnModel | undefined>();

  // Dragging item.
  const [draggingItem, setDraggingItem] = useState<{ source: Location; target?: Location }>();
  // While dragging, temporarily remap which items should be visible inside each column.
  const itemMapper: ItemsMapper = (column: string, items: KanbanItem[]) => {
    const { source, target } = draggingItem ?? {};
    if (source && target) {
      if (source?.column.id !== target?.column.id && (column === source?.column.id || column === target?.column.id)) {
        const modified = [...items];
        if (column === source.column.id) {
          // Temporarily remove from old column.
          modified.splice(source.idx!, 1);
        } else if (column === target.column.id) {
          // Temporarily insert into new column.
          // TODO(burdon): Use ref to track item being temporarily moved.
          modified.splice(target.idx ?? modified.length, 0, source.item!);
        }

        return modified;
      }
    }

    return items;
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    model.columns.forEach((column) => {
      if (column.id === active.id) {
        setDraggingColumn(column);
      } else {
        const idx = column.items.findIndex((item) => item.id === active.id);
        if (idx !== -1) {
          setDraggingItem({ source: { column, item: column.items[idx], idx } });
        }
      }
    });
  };

  const handleDragMove = (event: DragMoveEvent) => {};

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (draggingItem) {
      const { source } = draggingItem;
      const target = findLocation(model.columns, over?.id as string);
      if (active.id !== over?.id) {
        setDraggingItem({ source, target });
      }
    }
  };

  // TODO(burdon): Call model to update.
  const handleDragEnd = (event: DragEndEvent) => {
    if (draggingColumn) {
      const { active, over } = event;
      const oldIndex = model.columns.findIndex((column) => column.id === active.id);
      const newIndex = model.columns.findIndex((column) => column.id === over?.id);
      arrayMove(model.columns, oldIndex, newIndex);
    } else if (draggingItem) {
      const { source, target } = draggingItem;
      if (source.column.id === target!.column.id) {
        if (target!.idx !== undefined) {
          arrayMove(source.column.items, source.idx!, target!.idx);
        }
      } else {
        source.column.items.splice(source.idx!, 1);
        // TODO(burdon): Incorrect position when moving to new column.
        target!.column.items.splice(target!.idx ?? target!.column.items.length, 0, source.item!);
      }
    }

    setDraggingColumn(undefined);
    setDraggingItem(undefined);
  };

  const handleDragCancel = () => {
    setDraggingColumn(undefined);
    setDraggingItem(undefined);
  };

  const handleAddColumn = onAddColumn
    ? () => {
        const column = onAddColumn();
        model.columns.splice(model.columns.length, 0, column);
      }
    : undefined;

  const handleDeleteColumn = (id: string) => {
    const index = model.columns.findIndex((column) => column.id === id);
    if (index >= 0) {
      model.columns.splice(index, 1);
    }
  };

  const customModifier: Modifier = ({ transform }) => {
    if (draggingColumn) {
      return {
        ...transform,
        y: 0,
      };
    } else {
      return transform;
    }
  };

  return (
    <div className='flex overflow-x-scroll snap-x p-4 space-x-4'>
      <div className='flex space-x-4'>
        <DndContext
          sensors={[mouseSensor]}
          modifiers={[customModifier]}
          onDragStart={handleDragStart}
          onDragMove={handleDragMove}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <SortableContext strategy={horizontalListSortingStrategy} items={model.columns?.map(({ id }) => id)}>
            {model.columns.map((column) => (
              <KanbanColumnComponent
                key={column.id}
                column={column}
                itemMapper={itemMapper}
                onAdd={onAddItem}
                onDelete={() => handleDeleteColumn(column.id)}
              />
            ))}
          </SortableContext>

          {/* Overlay required to drag across columns. */}
          {draggingItem && (
            <DragOverlay style={{ margin: 0 }}>
              <KanbanItemComponent item={draggingItem.source.item!} onDelete={() => {}} />
            </DragOverlay>
          )}
        </DndContext>

        {handleAddColumn && <KanbanColumnComponentPlaceholder onAdd={handleAddColumn} />}
      </div>
    </div>
  );
};
