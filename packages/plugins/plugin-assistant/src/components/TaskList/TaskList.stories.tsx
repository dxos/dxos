//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Plan } from '@dxos/assistant-toolkit';
import { Process, type Trace } from '@dxos/compute';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import subAgentFixture from '../../execution-graph/testing/sub-agent-delegation.json';

import { TaskList } from './TaskList';

const SUB_AGENT_PID = Process.ID.make('cf8f7243-5b1d-4902-b158-70d9107d5f43');
const traceMessages = (subAgentFixture as unknown as Trace.Message[]).slice();

type DefaultStoryProps = {
  tasks?: Omit<Plan.Task, 'id'>[];
  traceMessages?: readonly Trace.Message[];
};

const DefaultStory = ({ tasks = [], traceMessages: traceMessagesProp }: DefaultStoryProps) => {
  const plan = React.useMemo(() => Plan.makePlan({ tasks }), [tasks]);
  return <TaskList plan={plan} traceMessages={traceMessagesProp} />;
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

export const WithDelegatedAgent: Story = {
  args: {
    tasks: [
      {
        title: 'Research widgets',
        status: 'in-progress',
        delegated: true,
        agentPid: SUB_AGENT_PID,
      },
      { title: 'Summarize findings', status: 'in-progress' },
    ],
    traceMessages,
  },
};

export const Empty: Story = {};
