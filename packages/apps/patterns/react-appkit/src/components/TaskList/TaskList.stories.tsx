//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';

import { useId } from '@dxos/react-components';

import { TaskList, TaskListItem } from './TaskList';

export default {
  component: TaskList
} as any;

export const Default = {
  render: ({ ...args }) => {
    const TaskListInstance = () => {
      const listId = useId('L');
      const [items, _setItems] = useState(
        [...Array(6)].map((_, index) => ({
          id: `${listId}--listItem-${index}`,
          defaultTitle: `${listId} item ${index + 1}`,
          defaultCompleted: false
        }))
      );

      return (
        <TaskList {...args} id={listId} defaultTitle={listId} defaultItemIdOrder={items.map(({ id }) => id)}>
          {items.map(({ id, defaultTitle, defaultCompleted }) => (
            <TaskListItem key={id} {...{ id, defaultTitle, defaultCompleted }} />
          ))}
        </TaskList>
      );
    };

    return (
      <>
        <TaskListInstance />
        <TaskListInstance />
      </>
    );
  },
  args: {}
};
