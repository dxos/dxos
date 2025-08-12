//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { faker } from '@dxos/random';
import { withTheme } from '@dxos/storybook-utils';

import { Timeline } from './Timeline';

faker.seed(1);

const meta: Meta<typeof Timeline> = {
  title: 'plugins/plugin-assistant/Timeline',
  component: Timeline,
  decorators: [withTheme],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    branches: [{ name: 'main' }, { name: 'feature-a' }, { name: 'feature-b' }, { name: 'feature-c' }],
    commits: [
      { id: 'c1', message: faker.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: faker.lorem.paragraph(), branch: 'main', parent: 'c1' },
      { id: 'c3', message: faker.lorem.paragraph(), branch: 'feature-a', parent: 'c2' },
      { id: 'c4', message: faker.lorem.paragraph(), branch: 'main', parent: 'c2' },
      { id: 'c5', message: faker.lorem.paragraph(), branch: 'feature-b', parent: 'c2' },
      { id: 'c6', message: faker.lorem.paragraph(), branch: 'feature-a', parent: 'c3' },
      { id: 'c7', message: faker.lorem.paragraph(), branch: 'feature-a', parent: 'c6' },
      { id: 'c8', message: faker.lorem.paragraph(), branch: 'feature-c', parent: 'c6' },
      { id: 'c9', message: faker.lorem.paragraph(), branch: 'main', parent: 'c4' },
    ],
  },
};

export const Linear: Story = {
  args: {
    branches: [{ name: 'main' }],
    commits: [
      { id: 'c1', message: faker.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: faker.lorem.paragraph(), branch: 'main', parent: 'c1' },
      { id: 'c3', message: faker.lorem.paragraph(), branch: 'main', parent: 'c2' },
      { id: 'c4', message: faker.lorem.paragraph(), branch: 'main', parent: 'c3' },
    ],
  },
};
