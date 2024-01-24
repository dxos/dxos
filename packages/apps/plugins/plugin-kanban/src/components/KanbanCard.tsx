//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, X } from '@phosphor-icons/react';
import React, { type FC } from 'react';

import type { Kanban as KanbanType } from '@braneframe/types';
import { Button, useTranslation } from '@dxos/react-ui';
import { MarkdownEditor, useTextModel } from '@dxos/react-ui-editor';
import { getSize, mx, attentionSurface, focusRing } from '@dxos/react-ui-theme';

import { KANBAN_PLUGIN } from '../meta';

const DeleteItem = ({ onClick }: { onClick: () => void }) => {
  const { t } = useTranslation(KANBAN_PLUGIN);
  return (
    <Button variant='ghost' onClick={onClick} classNames='plb-0 pli-0.5 -mlb-1'>
      <span className='sr-only'>{t('delete item label')}</span>
      <X className={getSize(4)} />
    </Button>
  );
};

export const KanbanCardComponent: FC<{
  column?: KanbanType.Column;
  item: KanbanType.Item;
  debug?: boolean;
  onDelete?: () => void;
}> = ({ column, item, debug = false, onDelete }) => {
  const { t } = useTranslation(KANBAN_PLUGIN);
  const { isDragging, attributes, listeners, transform, transition, setNodeRef } = useSortable({
    id: item.id,
    data: { type: 'item', column },
  });
  const tx = transform ? Object.assign(transform, { scaleY: 1 }) : null;
  const model = useTextModel({ text: item.title });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(tx), transition }}
      className={mx('flex grow', isDragging && 'border border-neutral-400 dark:border-neutral-800')}
    >
      <div className={mx('flex items-start grow p-1', attentionSurface, isDragging && 'opacity-10')}>
        {/* TODO(burdon): Standardize height (and below); e.g., via toolbar. */}
        <button className='flex h-[40px] items-center' {...attributes} {...listeners}>
          <DotsSixVertical className={getSize(5)} />
        </button>
        <div className='flex flex-col grow pt-1'>
          {model && (
            <MarkdownEditor
              model={model}
              placeholder={t('item title placeholder')}
              slots={{
                root: { className: mx(focusRing, 'p-1') },
              }}
            />
          )}
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
