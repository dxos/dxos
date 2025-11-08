//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { AnimatedBorder } from './AnimatedBorder';

const meta = {
  title: 'ui/react-ui-components/AnimatedBorder',
  component: AnimatedBorder,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof AnimatedBorder>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Animated Border',
  },
};
