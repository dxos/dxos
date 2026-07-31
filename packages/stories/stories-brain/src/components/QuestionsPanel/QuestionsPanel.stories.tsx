//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { QuestionsPanel } from './QuestionsPanel';

const meta = {
  title: 'stories/stories-brain/QuestionsPanel',
  component: QuestionsPanel,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof QuestionsPanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    questions: [
      { id: 'q-1', text: 'Who works on OPFS?', status: 'answered', answer: 'Carol and Alice.' },
      { id: 'q-2', text: 'When is the next release?', status: 'open' },
    ],
    onAdd: () => {},
  },
};
