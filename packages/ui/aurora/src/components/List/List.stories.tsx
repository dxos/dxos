//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { Play, PushPin } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { getSize, mx } from '@dxos/aurora-theme';

import {
  List,
  ListItem,
  ListItemOpenTrigger,
  ListItemCollapsibleContent,
  ListItemEndcap,
  ListItemHeading,
  arrayMove,
  DragEndEvent,
  MockListItemOpenTrigger,
} from './List';

export default {
  component: List,
};

export const Default = {
  render: ({ ...args }) => {
    const [items, setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: `List item ${index + 1}`,
      })),
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
      <List {...args} onDragEnd={handleDragEnd} listItemIds={items.map(({ id }) => id)}>
        {items.map(({ id, text }) => (
          <ListItem key={id} id={id}>
            <ListItemEndcap>
              <Play className={mx(getSize(5), 'mbs-2.5')} />
            </ListItemEndcap>
            <ListItemHeading className='grow pbs-2'>{text}</ListItemHeading>
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
    variant: 'ordered-draggable',
  },
};

export const Collapsible = {
  render: ({ ...args }) => {
    const [items, _setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: `List item ${index + 1}`,
        body: `Collapsible content for item ${index + 1}`,
      })),
    );

    return (
      <List {...args}>
        {items.map(({ id, text, body }, index) => (
          <ListItem key={id} id={id} collapsible={index !== 2}>
            {index !== 2 ? <ListItemOpenTrigger /> : <MockListItemOpenTrigger />}
            <ListItemHeading className='grow pbs-2'>{text}</ListItemHeading>
            <ListItemEndcap>
              <PushPin className={mx(getSize(5), 'mbs-2.5')} />
            </ListItemEndcap>
            {index !== 2 && <ListItemCollapsibleContent>{body}</ListItemCollapsibleContent>}
          </ListItem>
        ))}
      </List>
    );
  },
  args: {
    variant: 'unordered',
    toggleOpenLabel: 'Open/close storybook list item',
  },
};
