//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Icon } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';

export type RelatedItemsListProps = {
  items: ReadonlyArray<{ id: string; name?: string; status?: string }>;
  onNavigate?: (id: string) => void;
};

export const RelatedItemsList = ({ items, onNavigate }: RelatedItemsListProps) => {
  if (items.length === 0) {
    return <p className='text-sm text-description p-2'>No other sample items in this space.</p>;
  }

  // Navigate-only: clicking a row fires `onNavigate`; no retained selection.
  return (
    <Listbox.Root>
      <Listbox.Content classNames='gap-1'>
        {items.map((item) => (
          <Listbox.Item key={item.id} id={item.id} onClick={() => onNavigate?.(item.id)} classNames='gap-2'>
            <Icon icon='ph--book-open--regular' size={4} />
            <Listbox.ItemLabel>{item.name ?? 'Untitled'}</Listbox.ItemLabel>
            <Icon icon='ph--caret-right--regular' size={4} />
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};
