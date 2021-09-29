//
// Copyright 2020 DXOS.org
//

import { List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { makeStyles } from '@mui/styles';
import React from 'react';

import { ItemAdapter } from './adapter';

const useStyles = makeStyles(() => ({
  root: {},
  icon: {
    width: 48,
    minWidth: 48
  }
}));

export interface ListViewProps {
  adapter: ItemAdapter
  items: any[]
}

const ListView = ({ adapter, items = [] }: ListViewProps) => {
  const classes = useStyles();

  return (
    <List dense className={classes.root}>
      {items.map((item) => (
        <ListItem key={adapter.key(item)}>
          {adapter.icon && (
            <ListItemIcon className={classes.icon}>
              <adapter.icon item={item} />
            </ListItemIcon>
          )}
          <ListItemText
            primary={adapter.primary(item)}
            secondary={adapter.secondary?.(item)}
          />
        </ListItem>
      ))}
    </List>
  );
};

export default ListView;
