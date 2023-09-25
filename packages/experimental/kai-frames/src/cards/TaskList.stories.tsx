//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React, { useState } from 'react';

import { Task } from '@dxos/kai-types';
import { ClientDecorator } from '@dxos/react-client/testing';

import { TaskList } from './TaskList';

const Test = () => {
  const [tasks, setTasks] = useState<Task[]>([]);

  const handleCreate = (task: Task) => {
    setTasks((tasks) => [...tasks, task]);
  };

  const handleDelete = (task: Task) => {
    setTasks((tasks) => tasks.filter((t) => t.id !== task.id));
  };

  // TODO(burdon): Remove need for Observable; Or decouple from ClientProvider.
  return (
    <div className='flex flex-col w-full md:w-[390px] m-4 space-y-8 bg-white'>
      <TaskList id='tasks' tasks={tasks} onCreateItem={handleCreate} onDeleteItem={handleDelete} />
    </div>
  );
};

export default {
  component: TaskList,
  decorators: [
    ClientDecorator(),
    (Story: any) => (
      <div className='flex flex-col items-center h-screen w-full bg-zinc-100'>
        <Story />
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
