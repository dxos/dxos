//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Card } from '@dxos/react-ui-stack';
import { withTheme } from '@dxos/storybook-utils';

import { Grid } from './Grid';

const meta: Meta<typeof Grid.Cell> = {
  title: 'ui/react-ui-board/Cell',
  component: Grid.Cell,
  render: (args) => (
    <Grid.Root dimension={{ width: 1, height: 1 }} grid={{ size: { width: 300, height: 300 }, gap: 10 }}>
      <Grid.Content>
        <Grid.Cell {...args}>
          <Card.Text>This is a card with some long text that should wrap.</Card.Text>
        </Grid.Cell>
      </Grid.Content>
    </Grid.Root>
  ),
  decorators: [withTheme],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Grid.Cell>;

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
