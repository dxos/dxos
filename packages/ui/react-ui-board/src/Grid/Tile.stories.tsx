//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Grid } from './Grid';

const meta: Meta<typeof Grid.Tile> = {
  title: 'ui/react-ui-board/Tile',
  component: Grid.Tile,
  render: (args) => (
    <Grid.Root dimension={{ width: 1, height: 1 }} grid={{ size: { width: 300, height: 300 }, gap: 10 }}>
      <Grid.Content>
        <Grid.Tile {...args} />
      </Grid.Content>
    </Grid.Root>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Grid.Tile>;

export const Default: Story = {
  args: {
    item: {
      id: '0',
    },
    layout: {
      x: 0,
      y: 0,
    },
  },
};
