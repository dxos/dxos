//
// Copyright ${YEAR} DXOS.org
//

import React from 'react';

import { type Meta, type StoryObj } from '@storybook/react-vite';

const Component = () => <div>Test</div>;

const meta: Meta<typeof Component> = {
  title: 'example/Story',
  component: Component,
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
