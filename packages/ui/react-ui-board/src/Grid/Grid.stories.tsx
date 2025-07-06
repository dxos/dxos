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
    </Grid.Root>
  ),
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof Grid.Root>;

export const Default: Story = {
  args: {
    items: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }, { id: '6' }],
    layout: {
      tiles: {
        '1': { x: -3, y: -2 },
        '2': { x: 3, y: -1 },
        '3': { x: -1, y: 0, width: 1, height: 2 },
        '4': { x: -1, y: -1, width: 3 },
        '5': { x: 1, y: 0 },
        '6': { x: 0, y: 1, width: 2 },
      },
    },
  },
};
