//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { Hello } from './Hello';

const meta = {
  title: 'ui/react-ui-sfx/Hello',
  component: Hello,
  decorators: [withTheme()],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Hello>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { size: 32, duration: 0.3, classNames: 'text-sky-500 dark:text-sky-400' },
};
