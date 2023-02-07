//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { Trash, UsersThree } from 'phosphor-react';
import React from 'react';

import { getSize } from '../../styles';
import { mx } from '../../util';
import { List, ListItem } from './List';

export default {
  component: List
};

export const Default = {
  args: {
    selectable: false,
    variant: 'ordered',
    children: [...Array(12)].map((i) => (
      <ListItem
        key={i}
        {...{
          before: <UsersThree className={mx(getSize(6), 'mbs-2')} />,
          after: <Trash className={mx(getSize(6), 'mbs-2')} />,
          children: <p className='mbs-2'>List item</p>
        }}
      />
    ))
  }
};
