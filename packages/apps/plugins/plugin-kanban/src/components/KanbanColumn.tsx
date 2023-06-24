//
// Copyright 2023 DXOS.org
//

import { DotsSixVertical, X, Plus } from '@phosphor-icons/react';
import React, { FC, useCallback, useEffect, useState } from 'react';

import { Button, DragEndEvent, Input, List, ListItem, useTranslation } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
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

// TODO(burdon): Drag items between columns.
// TODO(burdon): Dragging object on top (no transparency).
// TODO(burdon): Scrolling.

export const KanbanColumnComponentPlaceholder: FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  return (
    <div className='flex flex-col justify-center outline outline-dashed rounded w-72 h-72'>
      <Button variant='ghost' onClick={onAdd} classNames='plb-0 pli-0.5 -mlb-1'>
        <span className='sr-only'>{t('add column label')}</span>
        <Plus className={getSize(6)} />
      </Button>
    </div>
  );
};

export const KanbanColumnComponent: FC<{ column: KanbanColumn; onDelete: () => void }> = ({ column, onDelete }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.

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

  // TODO(burdon): Factor out (with stack).
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = column.items.findIndex((item) => item.id === active.id);
      const newIndex = column.items.findIndex((item) => item.id === over?.id);
      arrayMove(column.items, oldIndex, newIndex);
    }
  }, []);

  // TODO(burdon): Width approx mobile phone width.
  return (
    <div className='flex flex-col p-2 outline rounded w-72'>
      <div className='flex items-center mb-2 mr-1'>
        {/* <ListItem.DragHandle /> */}
        <div className='mr-1'>
          <DotsSixVertical className={getSize(5)} />
        </div>

        <Input.Root>
          {/* TODO(burdon): Label shouldn't be unique per plugin? */}
          <Input.Label srOnly>{t('kanban column title label')}</Input.Label>
          {/* TODO(burdon): Is classNames boilerplate required everywhere? How to make consistent across plugins? Same for separator, etc. */}
          <Input.TextInput
            variant='subdued'
            defaultValue={column.title}
            onChange={({ target: { value } }) => (column.title = value)}
          />
        </Input.Root>

        {/* TODO(burdon): Menu. */}
        <DeleteColumn onClick={onDelete} />
      </div>

      <div>
        <List
          variant='ordered-draggable'
          listItemIds={column.items?.map(({ id }) => id)}
          onDragEnd={handleDragEnd}
          classNames='space-y-2'
        >
          {column.items?.map((item) => (
            <ListItem.Root key={item.id} id={item.id} classNames='flex items-center'>
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

      <div className='flex justify-center'>
        <AddItem onClick={handleAddItem} />
      </div>
    </div>
  );
};
