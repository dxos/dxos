//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import type { Meta, StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Grid } from './Grid';

const meta: Meta<typeof Grid.Root> = {
  title: 'ui/react-ui-board/Grid',
  component: Grid.Root,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

type Story = StoryObj<typeof Grid.Root>;

export const Default: Story = {
  args: {
    items: [{ id: '1' }, { id: '2' }, { id: '3' }],
    layout: {
      tiles: {
        '1': { x: 0, y: 0 },
        '2': { x: 0, y: 128 },
        '3': { x: 0, y: 256 },
      },
    },
  },
};
