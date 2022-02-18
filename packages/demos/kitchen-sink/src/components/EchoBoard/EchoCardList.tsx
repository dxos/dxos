//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { List, ListItem } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

export interface EchoCardListProps {
  items?: Item<ObjectModel>[]
  labelProperty?: string
}

export const EchoCardList = ({
  items = [],
  labelProperty = 'title'
}: EchoCardListProps) => {
  return (
    <List>
      {items.map(item => (
        <ListItem
          key={item.id}
        />
      ))}
    </List>
  );
};
