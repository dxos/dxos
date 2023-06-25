//
// Copyright 2023 DXOS.org
//

import { DragOverlay, DragStartEvent, useDroppable, DragOverEvent, UniqueIdentifier, DndContext } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, X, Plus } from '@phosphor-icons/react';
import React, { FC, useCallback, useEffect, useState } from 'react';

import { Button, DragEndEvent, Input, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { subscribe } from '@dxos/observable-object';
import { arrayMove } from '@dxos/util';

import type { KanbanColumn, KanbanItem } from '../props';
import { KanbanItemComponent } from './KanbanItem';

// TODO(burdon): Scrolling (radix -- see kai).
// TODO(burdon): Drag items between columns (lock x direction until threshold reached: see kai).
//  https://docs.dndkit.com/presets/sortable#multiple-containers
//  https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/presets-sortable-multiple-containers--basic-setup
//  https://github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/4-MultipleContainers.story.tsx

const DeleteColumn = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('delete column label')}</span>
      <X className={getSize(4)} />
    </Button>
  );
};

const AddItem = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('add item label')}</span>
      <Plus className={getSize(4)} />
    </Button>
  );
};

export const KanbanColumnComponentPlaceholder: FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  return (
    <div className='flex flex-col justify-center shadow rounded w-80 h-80 bg-neutral-50 dark:bg-neutral-900'>
      <Button variant='ghost' onClick={onAdd} classNames='plb-0 pli-0.5 -mlb-1'>
        <span className='sr-only'>{t('add column label')}</span>
        <Plus className={getSize(6)} />
      </Button>
    </div>
  );
};

export const KanbanColumnComponent: FC<{
  column: KanbanColumn;
  onAdd?: (column: KanbanColumn) => KanbanItem;
  onDelete?: () => void;
}> = ({ column, onAdd, onDelete }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  const { setNodeRef: droppableNodeRef, isOver } = useDroppable({ id: column.id });
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({ id: column.id });
  const tx = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  const [_, setIter] = useState([]);
  useEffect(() => {
    // TODO(burdon): Copying from Stack. Create custom hook?
    return column.items[subscribe](() => setIter([])) as () => void;
  }, []);

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragOver = ({ over, active }: DragOverEvent) => {
    console.log('over', over, active.id);
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = column.items.findIndex((item) => item.id === active.id);
      const newIndex = column.items.findIndex((item) => item.id === over?.id);
      arrayMove(column.items, oldIndex, newIndex);
    }
    setActiveId(null);
  }, []);

  const handleAddItem = onAdd
    ? () => {
        const item = onAdd(column);
        column.items.splice(column.items.length, 0, item);
      }
    : undefined;

  const handleDeleteItem = (id: string) => {
    const index = column.items.findIndex((column) => column.id === id);
    if (index >= 0) {
      column.items.splice(index, 1);
    }
  };

  // TODO(burdon): Width approx mobile phone width.
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(tx), transition }}
      className={mx('flex flex-col overflow-y-hidden', isDragging && 'relative z-10')}
    >
      <div
        className={mx(
          'flex flex-col py-2 overflow-hidden shadow rounded w-80 min-h-[320px] bg-neutral-50 dark:bg-neutral-900',
          isDragging && 'bg-neutral-100 dark:bg-neutral-800',
        )}
      >
        <div className='flex items-center mb-2 px-2'>
          <button {...attributes} {...listeners}>
            <DotsSixVertical className={getSize(5)} />
          </button>

          <Input.Root>
            {/* TODO(burdon): Label shouldn't be unique per plugin? */}
            <Input.Label srOnly>{t('kanban column title label')}</Input.Label>
            {/* TODO(burdon): Is classNames boilerplate required everywhere? How to make consistent across plugins? Same for separator, etc. */}
            <Input.TextInput
              variant='subdued'
              defaultValue={column.title}
              onChange={({ target: { value } }) => (column.title = value)}
              classNames='px-2'
            />
          </Input.Root>

          {/* TODO(burdon): Menu. */}
          {onDelete && <DeleteColumn onClick={onDelete} />}
        </div>

        {/* TODO(burdon): Does inner DndContext prevent dragging across columns? */}
        <DndContext
          onDragStart={handleDragStart}
          onDragCancel={handleDragCancel}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <SortableContext strategy={verticalListSortingStrategy} items={column.items?.map(({ id }) => id)}>
            <div ref={droppableNodeRef} className='flex flex-col grow overflow-y-scroll space-y-2 pr-4'>
              {column.items?.map((item) => (
                <div key={item.id} id={item.id} className='flex pl-2'>
                  <KanbanItemComponent item={item} onDelete={() => handleDeleteItem(item.id)} />
                </div>
              ))}
            </div>
          </SortableContext>

          {/* Overlay required to drag across columns. */}
          <DragOverlay>
            {activeId && (
              <KanbanItemComponent item={column.items.find((item) => item.id === activeId)!} onDelete={() => {}} />
            )}
          </DragOverlay>
        </DndContext>

        {handleAddItem && (
          <div className='flex justify-center mt-2'>
            <AddItem onClick={handleAddItem} />
          </div>
        )}
      </div>
    </div>
  );
};
