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

import { findLocation } from '../props';
import type { Location, KanbanColumn, KanbanModel, KanbanItem } from '../props';
import { ItemsMapper, KanbanColumnComponent, KanbanColumnComponentPlaceholder } from './KanbanColumn';
import { KanbanItemComponent } from './KanbanItem';
import { useSubscription } from './util';

// TODO(burdon): Touch sensors.
// TODO(burdon): Prevent browser nav back when swiping left/right.
// TODO(burdon): Consistently use FC?
export const KanbanBoard: FC<{ model: KanbanModel }> = ({ model }) => {
  const kanban = model.root;
  useSubscription(kanban.columns);

  const [_, setIter] = useState([]);
  useEffect(() => {
    const handle = createSubscription(() => setIter([]));
    handle.update([kanban.columns]);
    return () => handle.unsubscribe();
  }, []);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 8,
    },
  });

  // Dragging column.
  // TODO(burdon): Dragging column causes flickering when dragging left to first column.
  const [draggingColumn, setDraggingColumn] = useState<KanbanColumn | undefined>();

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
    kanban.columns.forEach((column) => {
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
      const target = findLocation(kanban.columns, over?.id as string);
      if (active.id !== over?.id) {
        setDraggingItem({ source, target });
      }
    }
  };

  // TODO(burdon): Call model to update.
  const handleDragEnd = (event: DragEndEvent) => {
    if (draggingColumn) {
      const { active, over } = event;
      const oldIndex = kanban.columns.findIndex((column) => column.id === active.id);
      const newIndex = kanban.columns.findIndex((column) => column.id === over?.id);
      arrayMove(kanban.columns, oldIndex, newIndex);
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

  const handleCreateColumn = () => {
    const column = model.createColumn();
    kanban.columns.splice(kanban.columns.length, 0, column);
  };

  // TODO(burdon): Move to model.
  const handleDeleteColumn = (id: string) => {
    const index = kanban.columns.findIndex((column) => column.id === id);
    if (index >= 0) {
      kanban.columns.splice(index, 1);
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
          <SortableContext strategy={horizontalListSortingStrategy} items={kanban.columns?.map(({ id }) => id)}>
            {kanban.columns.map((column) => (
              <KanbanColumnComponent
                key={column.id}
                column={column}
                itemMapper={itemMapper}
                onCreate={(column: KanbanColumn) => model.createItem(column)}
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

        {handleCreateColumn && <KanbanColumnComponentPlaceholder onAdd={handleCreateColumn} />}
      </div>
    </div>
  );
};
