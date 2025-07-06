//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Grid } from './Grid';

const meta: Meta<typeof Grid.Root> = {
  title: 'ui/react-ui-board/Grid',
  component: Grid.Root,
  render: (args) => (
    <Grid.Root {...args}>
      <Grid.Controls />
      <Grid.Background />
    </Grid.Root>
  ),
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof Grid.Root>;

export const Default: Story = {
  args: {
    items: [{ id: '0' }, { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }, { id: '6' }],
    margin: 300,
    grid: {
      size: { width: 300, height: 300 },
      gap: 16,
    },
    layout: {
      tiles: {
        '0': { x: 0, y: 0 },
        '1': { x: -3, y: -2 },
        '2': { x: 3, y: 2 },
        '3': { x: -1, y: 0, width: 1, height: 2 },
        '4': { x: -1, y: -1, width: 3 },
        '5': { x: 1, y: 0 },
        '6': { x: 0, y: 1, width: 2 },
      },
    },
  },
};
