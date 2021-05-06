//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { List, ListItem, ListItemIcon, ListItemText } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { Item } from '@dxos/echo-db';

const useStyles = makeStyles(() => ({
  root: {},
  icon: {
    width: 48,
    minWidth: 48
  }
}));

export interface ItemAdapter {
  key: (key: any) => string
  primary: (value: any) => string
  secondary?: (value: any) => string
  icon?: React.FunctionComponent<{item: Item<any>}>,
}

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
