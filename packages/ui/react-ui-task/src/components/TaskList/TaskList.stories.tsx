//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { Obj } from '@dxos/echo';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';

import { TaskList, type TaskPatch } from './TaskList';

const seed = (): Task.Task[] => [
  Task.make({ title: 'Source green coffee', status: 'done', priority: 'high' }),
  Task.make({ title: 'Finalize roast curve', status: 'in-progress', priority: 'high' }),
  Task.make({ title: 'Draft launch email', status: 'in-progress', assignee: { role: 'assistant', name: 'Scout' } }),
  Task.make({ title: 'Design label', status: 'todo', assignee: { email: 'riley@example.com' } }),
  Task.make({ title: 'Print run v1', status: 'cancelled' }),
];

const DefaultStory = ({ readonly }: { readonly?: boolean }) => {
  const [tasks, setTasks] = useState<Task.Task[]>(seed);

  const handleCreate = useCallback((title: string) => {
    setTasks((tasks) => [...tasks, Task.make({ title, status: 'todo' })]);
  }, []);

  const handleUpdate = useCallback((task: Task.Task, patch: TaskPatch) => {
    Obj.update(task, (task) => {
      Object.assign(task, patch);
    });
    setTasks((tasks) => [...tasks]);
  }, []);

  const handleDelete = useCallback((task: Task.Task) => {
    setTasks((tasks) => tasks.filter(({ id }) => id !== task.id));
  }, []);

  return (
    <div className='w-[36rem]'>
      <TaskList
        tasks={tasks}
        onTaskCreate={readonly ? undefined : handleCreate}
        onTaskUpdate={readonly ? undefined : handleUpdate}
        onTaskDelete={readonly ? undefined : handleDelete}
      />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-task/TaskList',
  render: (args) => <DefaultStory {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Readonly: Story = {
  args: { readonly: true },
};
