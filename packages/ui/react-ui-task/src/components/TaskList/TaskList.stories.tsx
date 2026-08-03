//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';
import { expect } from 'storybook/test';

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
      <TaskList.Root
        tasks={tasks}
        onTaskCreate={readonly ? undefined : handleCreate}
        onTaskUpdate={readonly ? undefined : handleUpdate}
        onTaskDelete={readonly ? undefined : handleDelete}
      >
        <TaskList.Viewport>
          <TaskList.Content />
          <TaskList.Create />
        </TaskList.Viewport>
      </TaskList.Root>
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

export const Default: Story = {
  // The status toggle and the add-`+` share one row grid; assert their icon gutters actually line
  // up, since only geometry (not the DOM) shows the misalignment.
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.item"]');
    const create = canvasElement.querySelector<HTMLElement>('[data-testid="taskList.create"]');
    if (!row || !create) {
      throw new Error('Task rows not found.');
    }

    const center = (element: Element) => {
      const { left, width } = element.getBoundingClientRect();
      return left + width / 2;
    };

    const rowIcon = row.firstElementChild;
    const createIcon = create.firstElementChild;
    if (!rowIcon || !createIcon) {
      throw new Error('Row icons not found.');
    }

    // Same icon column ⇒ same horizontal centre (sub-pixel tolerance for rounding).
    await expect(Math.abs(center(rowIcon) - center(createIcon))).toBeLessThan(1);
    // ...and the labels start at the same x.
    await expect(
      Math.abs(row.children[1].getBoundingClientRect().left - create.children[1].getBoundingClientRect().left),
    ).toBeLessThan(1);
    // The row spans the full width, so trailing actions sit at the far edge.
    await expect(row.getBoundingClientRect().width).toBeGreaterThan(create.getBoundingClientRect().width * 0.9);
  },
};

export const Readonly: Story = {
  args: { readonly: true },
};
