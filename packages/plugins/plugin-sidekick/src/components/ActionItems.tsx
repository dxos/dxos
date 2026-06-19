//
// Copyright 2025 DXOS.org
//

// TODO(burdon): Migrate to `RowList` once the multi-select model lands.
// `RowList` ships with single-selection (`selectedId` /
// `onSelectChange` paired with `aria-selected` / `dx-selected`). What
// this component needs is the *multi-select* `completed: boolean` per
// item (toggled by checkbox) — that explicit-action half is not yet
// tracked by `RowList`. See `react-ui-list/AUDIT.md` §6 / §11.

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
  const { t } = useTranslation(meta.profile.key);

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
