//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { List, ListItem } from '@dxos/react-list';
import { useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { Section } from './Section';

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
    <Section title={t('action-items.title')}>
      {items.length === 0 ? (
        <p className='text-sm text-description italic'>{t('no-action-items.label')}</p>
      ) : (
        // Non-selectable: each row carries its own `completed` checkbox state, not a
        // list-selection highlight — so this renders the plain ARIA list structure.
        <List variant='unordered' className='space-y-1'>
          {items.map((item) => (
            <ListItem key={item.id} className='flex items-center gap-2 text-sm'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={item.completed}
                  onChange={() => onToggle?.(item)}
                  className='shrink-0'
                />
                <span className={item.completed ? 'line-through text-description' : ''}>{item.text}</span>
              </label>
            </ListItem>
          ))}
        </List>
      )}
    </Section>
  );
};
