//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { List, ListItem } from '@dxos/react-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

import { meta } from '#meta';

import { Section } from './Section.tsx';

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
  const { t } = Hooks.useTranslation(meta.profile.key);

  return (
    <Section title={t('action-items.title')}>
      {items.length === 0 ? (
        <p className='text-sm text-fg-muted italic'>{t('no-action-items.label')}</p>
      ) : (
        // Non-selectable: each row carries its own `completed` checkbox state, not a
        // list-selection highlight — so this renders the plain ARIA list structure.
        <List variant='unordered' className='space-y-1'>
          {items.map((item) => (
            <ListItem key={item.id} className='flex items-center gap-2 text-sm'>
              <Input.Checkbox
                checked={item.completed}
                onCheckedChange={() => onToggle?.(item)}
                label={
                  <>
                    <span className={item.completed ? 'line-through text-fg-muted' : ''}>{item.text}</span>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Section>
  );
};
