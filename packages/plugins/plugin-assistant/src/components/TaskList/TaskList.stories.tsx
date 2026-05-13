//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Plan } from '@dxos/assistant-toolkit';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { TaskList } from './TaskList';

type DefaultStoryProps = {
  tasks?: Omit<Plan.Task, 'id'>[];
};

const DefaultStory = ({ tasks = [] }: DefaultStoryProps) => {
  const plan = React.useMemo(() => Plan.makePlan({ tasks }), [tasks]);
  return <TaskList plan={plan} />;
};

const meta = {
  title: 'plugins/plugin-assistant/components/TaskList',
  render: (args) => <DefaultStory {...args} />,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    tasks: [
      { title: 'Crack the eggs', status: 'done' },
      { title: 'Whisk with salt and pepper', status: 'done' },
      { title: 'Heat the pan with butter', status: 'in-progress' },
      { title: 'Pour and stir continuously', status: 'todo' },
      { title: 'Plate and serve', status: 'todo' },
    ],
  },
};

export const Empty: Story = {};
