//
// Copyright 2025 DXOS.org
//

// Presentational component that displays a list of related ExemplarItems.
// Uses React UI `List`/`ListItem`/`Icon` for consistent design system rendering.
// Navigation is handled via callback to keep framework dependencies out of components.

import React from 'react';

import { Icon, List, ListItem } from '@dxos/react-ui';

export type RelatedItemsListProps = {
  items: ReadonlyArray<{ id: string; name?: string; status?: string }>;
  onNavigate?: (id: string) => void;
};

export const RelatedItemsList = ({ items, onNavigate }: RelatedItemsListProps) => {
  if (items.length === 0) {
    return <p className='text-sm text-description p-2'>No other exemplar items in this space.</p>;
  }

  return (
    <List>
      {items.map((item) => (
        <ListItem.Root key={item.id} onClick={() => onNavigate?.(item.id)} classNames='cursor-pointer'>
          <ListItem.Endcap>
            <Icon icon='ph--book-open--regular' size={4} />
          </ListItem.Endcap>
          <ListItem.Heading>
            <span className='truncate'>{item.name ?? 'Untitled'}</span>
          </ListItem.Heading>
          <ListItem.Endcap>
            <Icon icon='ph--caret-right--regular' size={4} />
          </ListItem.Endcap>
        </ListItem.Root>
      ))}
    </List>
  );
};
