//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { BinauralPlayer } from './BinauralPlayer';

const meta = {
  title: 'plugins/plugin-sleep/components/BinauralPlayer',
  component: BinauralPlayer,
  decorators: [withTheme(), withLayout({ classNames: 'w-prose-max-width' })],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof BinauralPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
