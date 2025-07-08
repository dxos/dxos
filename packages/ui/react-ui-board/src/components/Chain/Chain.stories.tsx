//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Chain } from './Chain';

const meta: Meta<typeof Chain.Root> = {
  title: 'ui/react-ui-board/Chain',
  component: Chain.Root,
  render: (args) => (
    <Chain.Root {...args}>
      <Chain.Background />
    </Chain.Root>
  ),
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof Chain.Root>;

export const Default: Story = {
  args: {
    nodes: [
      { id: '1', type: 'custom', data: { label: 'Node 1' }, position: { x: 0, y: -128 } },
      { id: '2', type: 'custom', data: { label: 'Node 2' }, position: { x: 0, y: 0 } },
      { id: '3', type: 'custom', data: { label: 'Node 3' }, position: { x: 0, y: 128 } },
    ],
    edges: [
      { id: 'e1-2', source: '1', target: '2' },
      { id: 'e2-3', source: '2', target: '3' },
    ],
  },
};
