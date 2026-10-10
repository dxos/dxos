//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations } from '@dxos/react-ui/translations';

import { CUSTOM_EXAMPLE, GoalPanel } from './GoalPanel.tsx';

const meta = {
  title: 'stories/stories-brain/GoalPanel',
  component: GoalPanel,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof GoalPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    examples: [
      { value: CUSTOM_EXAMPLE, label: 'Custom goal' },
      { value: '3', label: '3. Get Dima to help me with the agent plugin' },
    ],
    example: '3',
    goal: 'Get Dima to help me with the agent plugin',
    instructions: 'Follow up after 2 days without a commitment.',
    ollama: false,
    reply: {
      kind: 'outcome',
      drivers: ['fact', 'time'],
      achievement: 'rule',
      datalog: '',
      notes: 'Refusals wake but never achieve; the follow-up stops once Dima commits.',
    },
    onExampleChange: () => {},
    onGoalChange: () => {},
    onInstructionsChange: () => {},
    onOllamaChange: () => {},
    onCompile: () => {},
  },
};

export const Busy: Story = {
  args: { ...Default.args, busy: true, reply: undefined },
};
