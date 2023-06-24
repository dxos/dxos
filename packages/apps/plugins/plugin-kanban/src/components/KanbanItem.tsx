//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, X } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Button, Input, useTranslation } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';

import type { KanbanItem } from '../props';

const DeleteItem = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('delete item label')}</span>
      <X className={getSize(4)} />
    </Button>
  );
};

export const KanbanItemComponent: FC<{ item: KanbanItem; onDelete: () => void }> = ({ item, onDelete }) => {
  const { t } = useTranslation('dxos.org/plugin/kanban'); // TODO(burdon): Make consistent across plugins.
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({ id: item.id });
  const tx = transform ? Object.assign(transform, { scaleY: 1 }) : null;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(tx), transition }}
      className={mx('flex grow p-1 border bg-white dark:bg-neutral-925', isDragging && 'relative z-10')}
    >
      <button {...attributes} {...listeners}>
        <DotsSixVertical className={getSize(5)} />
      </button>
      <Input.Root>
        {/* TODO(burdon): Label shouldn't be unique per plugin? */}
        <Input.Label srOnly>{t('kanban item title label')}</Input.Label>
        {/* TODO(burdon): Remove border; Auto-expand height */}
        <Input.TextArea
          rows={1}
          variant='subdued'
          defaultValue={item.title}
          onChange={({ target: { value } }) => (item.title = value)}
          classNames='px-1 border-none resize-none'
        />
      </Input.Root>
      <DeleteItem onClick={onDelete} />
    </div>
  );
};
