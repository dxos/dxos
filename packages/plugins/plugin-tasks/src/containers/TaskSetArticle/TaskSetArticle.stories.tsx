//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Person, Task, TaskSet } from '@dxos/types';

import { translations } from '#translations';

import { TaskSetArticle } from './TaskSetArticle';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [taskSet, setTaskSet] = useState<TaskSet.TaskSet>();

  useEffect(() => {
    if (!space || taskSet) {
      return;
    }
    const set = space.db.add(TaskSet.make({ name: 'Spring Blend Launch' }));
    const kai = space.db.add(Obj.make(Person.Person, { fullName: 'Kai Watanabe' }));
    const seed: Array<Partial<Obj.MakeProps<typeof Task.Task>> & { title: string }> = [
      { title: 'Source green coffee', status: 'done', priority: 'high', assignee: { contact: Ref.make(kai) } },
      { title: 'Finalize roast curve', status: 'in-progress', priority: 'high', assignee: { contact: Ref.make(kai) } },
      { title: 'Draft launch email', status: 'in-progress', assignee: { role: 'assistant', name: 'Scout' } },
      { title: 'Design label', status: 'todo', priority: 'medium', assignee: { email: 'riley@example.com' } },
      { title: 'Schedule cuppings', status: 'todo' },
      { title: 'Print run v1', status: 'cancelled' },
    ];
    for (const props of seed) {
      const task = space.db.add(Task.make(props));
      Obj.setParent(task, set);
    }
    setTaskSet(set);
  }, [space, taskSet]);

  const subject = useMemo(() => taskSet, [taskSet]);
  if (!subject) {
    return null;
  }

  return (
    <div className='dx-container is-full bs-full'>
      <TaskSetArticle role='article' subject={subject} attendableId='story' />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-tasks/containers/TaskSetArticle',
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [TaskSet.TaskSet, Task.Task, Person.Person],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <DefaultStory />,
};
