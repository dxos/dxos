//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';

import { ItemAdapter } from '../adapter';

export interface EchoListProps {
  items: any[]
  itemAdapter: ItemAdapter
}

export const EchoList = ({
  items = [],
  itemAdapter
}: EchoListProps) => {
  return (
    <List dense>
      {items.map((item) => {
        const { label, icon: Icon } = itemAdapter.meta?.(item.type!) ?? {};
        return (
          <ListItem key={item.id}>
            {Icon && (
              <ListItemIcon>
                <Icon />
              </ListItemIcon>
            )}
            <ListItemText
              primary={itemAdapter.title(item)}
              secondary={label}
            />
          </ListItem>
        );
      })}
    </List>
  );
};
