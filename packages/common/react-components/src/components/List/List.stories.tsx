//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Play, PushPin } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { getSize } from '../../styles';
import { mx } from '../../util';
import { List, ListItem, ListItemCollapsibleContent, ListItemEndcap, ListItemHeading } from './List';

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
    const handleDragEnd = (event: DragEndEvent) => {
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
            <ListItemEndcap>
              <Play className={mx(getSize(5), 'mbs-2.5')} />
            </ListItemEndcap>
            <ListItemHeading className='grow mbs-2'>{text}</ListItemHeading>
            <ListItemEndcap>
              <PushPin className={mx(getSize(5), 'mbs-2.5')} />
            </ListItemEndcap>
          </ListItem>
        ))}
      </List>
    );
  },
  args: {
    selectable: true,
    variant: 'ordered-draggable'
  }
};

export const Collapsible = {
  render: ({ ...args }) => {
    const [items, _setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: `List item ${index + 1}`,
        body: `Collapsible content for item ${index + 1}`
      }))
    );

    return (
      <List {...args} labelId='excluded'>
        {items.map(({ id, text, body }, index) => (
          <ListItem key={id} id={id} collapsible={index !== 2}>
            <ListItemHeading asChild>
              <div className='flex'>
                <p className='grow mbs-2'>{text}</p>
                <ListItemEndcap>
                  <PushPin className={mx(getSize(5), 'mbs-2.5')} />
                </ListItemEndcap>
              </div>
            </ListItemHeading>
            {index !== 2 && <ListItemCollapsibleContent>{body}</ListItemCollapsibleContent>}
          </ListItem>
        ))}
      </List>
    );
  },
  args: {
    variant: 'unordered',
    collapsible: true,
    toggleOpenLabel: 'Open/close storybook list item'
  }
};
