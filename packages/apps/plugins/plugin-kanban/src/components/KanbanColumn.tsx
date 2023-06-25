//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, X, Plus } from '@phosphor-icons/react';
import React, { FC, useEffect, useState } from 'react';

import { Button, Input, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { subscribe } from '@dxos/observable-object';

import type { KanbanColumn, KanbanItem } from '../props';
import { KanbanItemComponent } from './KanbanItem';

// TODO(burdon): Scrolling (radix -- see kai).
// TODO(burdon): Drag items between columns (lock x direction until threshold reached: see kai).
//  https://docs.dndkit.com/presets/sortable#multiple-containers
//  https://master--5fc05e08a4a65d0021ae0bf2.chromatic.com/?path=/story/presets-sortable-multiple-containers--basic-setup
//  https://github.com/clauderic/dnd-kit/blob/master/stories/2%20-%20Presets/Sortable/4-MultipleContainers.story.tsx

const DeleteColumn = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban');
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('delete column label')}</span>
      <X className={getSize(4)} />
    </Button>
  );
};

const AddItem = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban');
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('add item label')}</span>
      <Plus className={getSize(4)} />
    </Button>
  );
};

// TODO(burdon): Factor out container.
export const KanbanColumnComponentPlaceholder: FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban');
  return (
    <div className='flex flex-col justify-center shadow rounded w-80 h-80 bg-neutral-50 dark:bg-neutral-900'>
      <Button variant='ghost' onClick={onAdd} classNames='plb-0 pli-0.5 -mlb-1'>
        <span className='sr-only'>{t('add column label')}</span>
        <Plus className={getSize(6)} />
      </Button>
    </div>
  );
};

export type ActiveItem = {
  item: KanbanItem;
  over: {
    column: string;
    item?: string;
  };
};

export const KanbanColumnComponent: FC<{
  column: KanbanColumn;
  active?: ActiveItem;
  onAdd?: (column: KanbanColumn) => KanbanItem;
  onDelete?: () => void;
}> = ({ column, active, onAdd, onDelete }) => {
  const [_, setIter] = useState([]);
  useEffect(() => {
    // TODO(burdon): Copying from Stack. Create custom hook?
    return column.items[subscribe](() => setIter([])) as () => void;
  }, []);

  const { t } = useTranslation('dxos.org/plugin/kanban');

  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: column.id });
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({
    id: column.id,
    data: { type: 'column' },
  });
  const tx = transform ? Object.assign(transform, { scaleY: 1 }) : null;

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

  // TODO(burdon): Splice ina active element.
  const items = column.items.filter((item) => active?.over.column === column.id || active?.item.id !== item.id);

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
            <Input.Label srOnly>{t('column title label')}</Input.Label>
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

        <SortableContext strategy={verticalListSortingStrategy} items={items.map(({ id }) => id)}>
          <div ref={setDroppableNodeRef} className='flex flex-col grow overflow-y-scroll space-y-2 pr-4'>
            {items.map((item) => (
              <div key={item.id} id={item.id} className='flex pl-2'>
                <KanbanItemComponent column={column} item={item} onDelete={() => handleDeleteItem(item.id)} />
              </div>
            ))}
          </div>
        </SortableContext>

        {handleAddItem && (
          <div className='flex justify-center mt-2'>
            <AddItem onClick={handleAddItem} />
          </div>
        )}

        <div className='px-2 text-xs text-red-800'>{column.id.slice(0, 9)}</div>
      </div>
    </div>
  );
};
