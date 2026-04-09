//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ActiveSpacePanel } from './ActiveSpacePanel';

const meta = {
  title: 'plugins/plugin-exemplar/ActiveSpacePanel',
  component: ActiveSpacePanel,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
} satisfies Meta<typeof ActiveSpacePanel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    spaceName: 'My Workspace',
  },
};

export const NoSpace: Story = {
  args: {},
};
