//
// Copyright ${YEAR} DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

const Component = () => <div>Test</div>;

const meta: Meta<typeof Component> = {
  title: 'example/Story',
  component: Component,
  decorators: [withTheme],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
