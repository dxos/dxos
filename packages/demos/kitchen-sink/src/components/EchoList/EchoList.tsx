//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Box, List, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { ItemAdapter } from '../adapter';

export interface EchoListProps {
  items?: Item<ObjectModel>[]
  itemAdapter: ItemAdapter
}

export const EchoList = ({
  items = [],
  itemAdapter
}: EchoListProps) => {
  return (
    <Box sx={{
      display: 'flex',
      flex: 1,
      overflowX: 'hidden',
      overflowY: 'scroll'
    }}>
      <List
        dense
        disablePadding
        sx={{
          width: '100%'
        }}
      >
        {items.map((item) => {
          const { icon: Icon } = itemAdapter.meta?.(item.type!) ?? {};
          return (
            <ListItemButton
              key={item.id}
              dense
            >
              {Icon && (
                <ListItemIcon>
                  <Icon />
                </ListItemIcon>
              )}
              <ListItemText
                primary={itemAdapter.title(item)}
                secondary={itemAdapter.description(item)}
              />
            </ListItemButton>
          );
        })}
      </List>
    </Box>
  );
};
