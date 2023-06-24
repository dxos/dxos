//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, X, Plus } from '@phosphor-icons/react';
import React, { FC, useCallback, useEffect, useState } from 'react';

import { Button, DragEndEvent, Input, List, ListItem, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { subscribe } from '@dxos/observable-object';
import { arrayMove } from '@dxos/util';

import type { KanbanColumn } from '../props';
import { KanbanItemComponent } from './KanbanItem';

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

// TODO(burdon): Drag items between columns (lock x direction until threshold reached: see kai).
// TODO(burdon): Dragging object on top (no transparency).
// TODO(burdon): Scrolling.

export const KanbanColumnComponentPlaceholder: FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  return (
    <div className='flex flex-col justify-center shadow rounded w-72 h-72 bg-neutral-50 dark:bg-neutral-925'>
      <Button variant='ghost' onClick={onAdd} classNames='plb-0 pli-0.5 -mlb-1'>
        <span className='sr-only'>{t('add column label')}</span>
        <Plus className={getSize(6)} />
      </Button>
    </div>
  );
};

export const KanbanColumnComponent: FC<{ column: KanbanColumn; onDelete: () => void }> = ({ column, onDelete }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({ id: column.id });
  const tx = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  const [_, setIter] = useState([]);
  useEffect(() => {
    // TODO(burdon): Copying from Stack. Create custom hook?
    return column.items[subscribe](() => setIter([])) as () => void;
  }, []);

  const handleAddItem = () => {
    column.items.splice(column.items.length, 0, {
      id: 'item-' + Math.random(),
      title: 'Item ' + (column.items.length + 1),
    });
  };

  const handleDeleteItem = (id: string) => {
    const index = column.items.findIndex((column) => column.id === id);
    if (index >= 0) {
      column.items.splice(index, 1);
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = column.items.findIndex((item) => item.id === active.id);
      const newIndex = column.items.findIndex((item) => item.id === over?.id);
      arrayMove(column.items, oldIndex, newIndex);
    }
  }, []);

  // TODO(burdon): Width approx mobile phone width.
  // TODO(burdon): Min height not working.
  // TODO(burdon): Impl. dragging relative/z  className in List.Item.
  return (
    <div
      ref={setNodeRef}
      className={mx('flex flex-col overflow-y-hidden', isDragging && 'relative z-10')}
      style={{ transform: CSS.Transform.toString(tx), transition }}
    >
      <div
        className={mx(
          'flex flex-col py-2 overflow-hidden shadow rounded w-72 min-w-72 __min-h-72 bg-neutral-50 dark:bg-neutral-925',
          isDragging && 'bg-neutral-100 dark:bg-neutral-900',
        )}
      >
        <div className='flex items-center mb-2 pl-2 pr-5'>
          <div className='mr-1'>
            <button {...attributes} {...listeners}>
              <DotsSixVertical className={getSize(5)} />
            </button>
          </div>

          <Input.Root>
            {/* TODO(burdon): Label shouldn't be unique per plugin? */}
            <Input.Label srOnly>{t('kanban column title label')}</Input.Label>
            {/* TODO(burdon): Is classNames boilerplate required everywhere? How to make consistent across plugins? Same for separator, etc. */}
            <Input.TextInput
              variant='subdued'
              defaultValue={column.title}
              onChange={({ target: { value } }) => (column.title = value)}
              classNames='px-1'
            />
          </Input.Root>

          {/* TODO(burdon): Menu. */}
          <DeleteColumn onClick={onDelete} />
        </div>

        {/* TODO(burdon): Custom (radix) scrollbar (move to list). Scrolling bug if drag to bottom (see kai). */}
        <div className='flex flex-col grow overflow-y-scroll pr-4'>
          <List
            variant='ordered-draggable'
            listItemIds={column.items?.map(({ id }) => id)}
            onDragEnd={handleDragEnd}
            classNames='space-y-1'
          >
            {column.items?.map((item) => (
              <ListItem.Root key={item.id} id={item.id} classNames='flex items-center pl-2'>
                <div className='flex flex-col items-center'>
                  <ListItem.DragHandle />
                </div>
                <div className='grow'>
                  <KanbanItemComponent item={item} onDelete={() => handleDeleteItem(item.id)} />
                </div>
              </ListItem.Root>
            ))}
          </List>
        </div>

        <div className='flex justify-center mt-2'>
          <AddItem onClick={handleAddItem} />
        </div>
      </div>
    </div>
  );
};
