//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { arrayMove } from '@dnd-kit/sortable';
import React, { ComponentPropsWithoutRef, useState } from 'react';

import { List, ListItem } from './List';

export default {
  component: List
};

export const Default = {
  render: ({ ...args }) => {
    const [items, setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: `List item ${index + 1}`
      }))
    );
    const handleDragEnd = (
      event: Parameters<Exclude<ComponentPropsWithoutRef<typeof List>['onDragEnd'], undefined>>[0]
    ) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
        setItems((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over?.id);

          return arrayMove(items, oldIndex, newIndex);
        });
      }
    };
    return (
      <List {...args} labelId='excluded' onDragEnd={handleDragEnd} listItemIds={items.map(({ id }) => id)}>
        {items.map(({ id, text }) => (
          <ListItem key={id} id={id}>
            <p className='mbs-2'>{text}</p>
          </ListItem>
        ))}
      </List>
    );
  },
  args: {
    selectable: false,
    variant: 'ordered-draggable'
  }
};
