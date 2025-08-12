//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import { Timeline } from './Timeline';

const meta: Meta<typeof Timeline> = {
  title: 'plugins/plugin-assistant/Timeline',
  component: Timeline,
  decorators: [withTheme],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    branches: [{ name: 'main' }, { name: 'feature-a' }, { name: 'feature-b' }],
    commits: [
      { id: 'c1', message: 'init', branch: 'main', parents: [] },
      { id: 'c2', message: 'feat', branch: 'main', parents: ['c1'] },
      { id: 'c3', message: 'feat A', branch: 'feature-a', parents: ['c2'] },
      { id: 'c4', message: 'merge', branch: 'main', parents: ['c2', 'c3'] },
      { id: 'c5', message: 'feat B', branch: 'feature-b', parents: ['c4'] },
      { id: 'c6', message: 'increment', branch: 'feature-b', parents: ['c5'] },
      { id: 'c7', message: 'increment', branch: 'main', parents: ['c4'] },
    ],
  },
};
