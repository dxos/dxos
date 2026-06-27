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

  // Navigate-only: the row hosts a focusable button (keyboard-accessible) rather than a
  // row-level click, since plain `Listbox.Item`s are `role=listitem` (not focusable options).
  return (
    <Listbox.Root>
      <Listbox.Content classNames='gap-1'>
        {items.map((item) => (
          <Listbox.Item key={item.id} id={item.id} classNames='p-0'>
            <button
              type='button'
              onClick={() => onNavigate?.(item.id)}
              className='flex w-full items-center gap-2 px-3 py-2 text-start dx-focus-ring'
            >
              <Icon icon='ph--book-open--regular' size={4} />
              <Listbox.ItemLabel>{item.name ?? 'Untitled'}</Listbox.ItemLabel>
              <Icon icon='ph--caret-right--regular' size={4} />
            </button>
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};
