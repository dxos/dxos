//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Migrate to `RowList` once the selection model lands.
// This is a multi-select / "completed" pattern — `completed: boolean`
// per item, toggled by checkbox — which is the explicit-action
// `aria-selected` half that `RowList` deliberately doesn't track yet
// (see `react-ui-list/AUDIT.md` §6 "Current vs selection"). The
// current `RowList` only models a single navigated `currentId`.

import React from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Form } from '@dxos/react-ui-form';

import { meta } from '#meta';

export type ActionItem = {
  id: string;
  text: string;
  completed: boolean;
};

export type ActionItemsProps = {
  items: ActionItem[];
  onToggle?: (item: ActionItem) => void;
};

export const ActionItems = ({ items, onToggle }: ActionItemsProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <Form.Section label={t('action-items.title')}>
      {items.length === 0 ? (
        <p className='text-sm text-description italic'>{t('no-action-items.label')}</p>
      ) : (
        <ul className='space-y-1'>
          {items.map((item) => (
            <li key={item.id} className='flex items-center gap-2 text-sm'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={item.completed}
                  onChange={() => onToggle?.(item)}
                  className='shrink-0'
                />
                <span className={item.completed ? 'line-through text-description' : ''}>{item.text}</span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </Form.Section>
  );
};
