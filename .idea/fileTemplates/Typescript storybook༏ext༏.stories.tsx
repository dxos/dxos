//
// Copyright ${YEAR} DXOS.org
//

import React from 'react';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

const Component = () => <div>Test</div>;

const meta = {
  title: 'example/Story',
  component: Component,
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Component>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
