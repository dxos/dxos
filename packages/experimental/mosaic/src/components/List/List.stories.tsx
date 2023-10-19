//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { Circle, X } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { getSize } from '@dxos/react-ui-theme';
import { range } from '@dxos/util';

import { List, ListItem, IconButton, ListItemText } from './List';
import { type Item } from '../../layout';
import { createItem, SeedDecorator, type TestData } from '../../testing';

const num = 20;

const Test = () => {
  const [items] = useState<Item<TestData>[]>(() => range(num).map(() => createItem()));

  // TODO(burdon): Selection/highlight.
  // TODO(burdon): Slots.
  // TODO(burdon): Density.
  // TODO(burdon): Scrolling.
  // TODO(burdon): Editable variant.
  // TODO(burdon): Checkbox.
  return (
    <List>
      {items.map((item) => (
        <ListItem
          key={item.id}
          gutter={
            <IconButton>
              <Circle className={getSize(5)} />
            </IconButton>
          }
          action={
            <IconButton>
              <X className={getSize(5)} />
            </IconButton>
          }
        >
          <ListItemText>{item.data?.title}</ListItemText>
        </ListItem>
      ))}
    </List>
  );
};

export default {
  component: List,
  decorators: [
    SeedDecorator(999),
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full bg-zinc-200'>
        <div className='flex w-[300px] h-full overflow-hidden bg-white shadow'>
          <Story />
        </div>
      </div>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  render: () => <Test />,
};
