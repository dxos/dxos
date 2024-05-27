//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, X, Plus } from '@phosphor-icons/react';
import React, { type FC } from 'react';

import { type KanbanColumnType, type KanbanItemType } from '@braneframe/types';
import { Button, Input, useTranslation } from '@dxos/react-ui';
import { modalSurface, getSize, groupSurface, mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { KanbanCardComponent } from './KanbanCard';
import { useSubscription } from './util';
import { KANBAN_PLUGIN } from '../meta';

export type ItemsMapper = (column: string, items: KanbanItemType[]) => KanbanItemType[];

const DeleteColumn = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation(KANBAN_PLUGIN);
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('delete column label')}</span>
      <X className={getSize(4)} />
    </Button>
  );
};

const AddItem = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation(KANBAN_PLUGIN);
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('add item label')}</span>
      <Plus className={getSize(4)} />
    </Button>
  );
};

// TODO(burdon): Factor out container.
export const KanbanColumnComponentPlaceholder: FC<{ onAdd: () => void }> = ({ onAdd }) => {
  const { t } = useTranslation(KANBAN_PLUGIN);
  return (
    <div className={mx('flex flex-col justify-center shadow rounded w-[300px] h-[300px]', groupSurface)}>
      <Button variant='ghost' onClick={onAdd} classNames='plb-0 pli-0.5 -mlb-1'>
        <span className='sr-only'>{t('add column label')}</span>
        <Plus className={getSize(6)} />
      </Button>
    </div>
  );
};

export const KanbanColumnComponent: FC<{
  column: KanbanColumnType;
  itemMapper?: ItemsMapper;
  debug?: boolean; // TODO(burdon): Context.
  onCreate?: (column: KanbanColumnType) => KanbanItemType;
  onDelete?: () => void;
}> = ({ column, itemMapper, debug = false, onCreate, onDelete }) => {
  const { t } = useTranslation(KANBAN_PLUGIN);

  // TODO(wittjosiah): Remove?
  useSubscription([column.items]);
  const items = itemMapper?.(column.id!, column.items.filter(nonNullable)) ?? column.items!;

  const { setNodeRef: setDroppableNodeRef } = useDroppable({ id: column.id! });
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({
    id: column.id!,
    data: { type: 'column' },
  });
  const tx = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  const handleAddItem = onCreate
    ? () => {
        const item = onCreate(column);
        column.items!.splice(column.items!.length, 0, item);
      }
    : undefined;

  const handleDeleteItem = (id: string) => {
    const index = column.items.filter(nonNullable).findIndex((column) => column.id === id);
    if (index >= 0) {
      column.items!.splice(index, 1);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(tx), transition }}
      className={mx('flex flex-col snap-center overflow-y-hidden', isDragging && 'relative z-10')}
    >
      {/* TODO(burdon): Width approx mobile phone width. */}
      <div
        className={mx(
          'flex flex-col py-2 overflow-hidden shadow rounded w-[300px] min-h-[300px]',
          isDragging ? modalSurface : groupSurface,
        )}
      >
        <div className='flex items-center mb-2 px-2'>
          <button {...attributes} {...listeners}>
            <DotsSixVertical className={getSize(5)} />
          </button>

          <Input.Root>
            <Input.Label srOnly>{t('column title label')}</Input.Label>
            <Input.TextInput
              variant='subdued'
              classNames='px-2'
              placeholder={t('column title placeholder')}
              defaultValue={column.title}
              onChange={({ target: { value } }) => (column.title = value)}
            />
          </Input.Root>

          {/* TODO(burdon): Menu. */}
          {onDelete && <DeleteColumn onClick={onDelete} />}
        </div>

        {/* TODO(burdon): Scrolling (radix; see kai/mosaic). */}
        <SortableContext strategy={verticalListSortingStrategy} items={items.filter(nonNullable).map(({ id }) => id)}>
          <div ref={setDroppableNodeRef} className='flex flex-col grow overflow-y-scroll space-y-2 pr-4'>
            {items.filter(nonNullable).map((item) => (
              <div key={item.id} id={item.id} className='flex pl-2'>
                <KanbanCardComponent column={column} item={item} onDelete={() => handleDeleteItem(item.id)} />
              </div>
            ))}
          </div>
        </SortableContext>

        {handleAddItem && (
          <div className='flex justify-center mt-2'>
            <AddItem onClick={handleAddItem} />
          </div>
        )}

        {debug && <div className='px-2 text-xs text-red-800'>{column.id!.slice(0, 9)}</div>}
      </div>
    </div>
  );
};
