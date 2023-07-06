//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, X } from '@phosphor-icons/react';
import React, { FC } from 'react';

import type { Kanban as KanbanType } from '@braneframe/types';
import { Button, Input, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

const DeleteItem = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban');
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('delete item label')}</span>
      <X className={getSize(4)} />
    </Button>
  );
};

export const KanbanItemComponent: FC<{
  column?: KanbanType.Column;
  item: KanbanType.Item;
  debug?: boolean;
  onDelete?: () => void;
}> = ({ column, item, debug = false, onDelete }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban');
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({
    id: item.id,
    data: { type: 'item', column },
  });
  const tx = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(tx), transition }}
      className={mx('flex grow border border-neutral-100 dark:border-neutral-800', isDragging && 'border-dashed')}
    >
      <div className={mx('flex items-start grow p-1 bg-white dark:bg-neutral-925', isDragging && 'opacity-10')}>
        <button className='flex h-[40px] items-center' {...attributes} {...listeners}>
          <DotsSixVertical className={getSize(5)} />
        </button>
        <div className='flex flex-col grow'>
          <Input.Root>
            <Input.Label srOnly>{t('item content label')}</Input.Label>
            {/* TODO(burdon): Pluggable content; e.g., use text document. */}
            {/* TODO(burdon): Remove border when focused; Auto-expand height */}
            <Input.TextArea
              rows={3}
              variant='subdued'
              placeholder={t('item content placeholder')}
              defaultValue={item.content}
              onChange={({ target: { value } }) => (item.content = value)}
              // TODO(burdon): Consistent vertical padding with input.
              classNames='px-1 border-none resize-none'
            />
          </Input.Root>

          {debug && <div className='text-xs text-red-800'>{item.id.slice(0, 9)}</div>}
        </div>
        {onDelete && (
          <div className='flex h-[40px] items-center'>
            <DeleteItem onClick={onDelete} />
          </div>
        )}
      </div>
    </div>
  );
};
