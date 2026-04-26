//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

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
  args: { size: 160 },
};

export const Slow: Story = {
  args: { size: 160, duration: 4 },
};

export const Themed: Story = {
  args: { size: 160, classNames: 'text-sky-500 dark:text-sky-400' },
};
