//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { BinauralPlayer } from './BinauralPlayer';

const meta = {
  title: 'plugins/plugin-zen/components/BinauralPlayer',
  component: BinauralPlayer,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof BinauralPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
