//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import { PublicKey } from '@dxos/keys';
import { DensityProvider } from '@dxos/react-ui';

import { deepSignal } from 'deepsignal/react';

// eslint-disable-next-line
import React, { useState } from 'react';
import { Task } from './TaskItem';

import { TaskListComponent } from './TaskList';

// TODO(burdon): Indent.
// TODO(burdon): Move up/down.
// TODO(burdon): Insert ahead.
// TODO(burdon): Delete.

const Story = () => {
  const [tasks] = useState(deepSignal([
    deepSignal({
      id: 'task-1',
      title: 'London',
    }),
    deepSignal({
      id: 'task-2',
      title: 'New York',
      subtasks: [
        deepSignal({
          id: 'task-2a',
          title: 'Brooklyn',
        }),
        deepSignal({
          id: 'task-2b',
          title: 'Manhattan',
        }),
      ],
    }),
    deepSignal({
      id: 'task-3',
      title: 'Tokyo',
    }),
    deepSignal({
      id: 'task-4',
      title: 'Paris',
    }),
  ]));

  const handleCreate = (parent?: Task, index?: number) => {
    const task = deepSignal({
      id: PublicKey.random().toHex()
    });

    if (parent && !parent.subtasks) {
      parent.subtasks = deepSignal([task]);
    } else {
      const list = parent?.subtasks ?? tasks;
      list.splice(index ?? list.length, 0, task);
    }

    return task;
  }

  return <DensityProvider density='fine'><TaskListComponent tasks={tasks} onCreate={handleCreate}/></DensityProvider>
}

export default {
  component: TaskListComponent,
  render: Story,
};

export const Default = {};
