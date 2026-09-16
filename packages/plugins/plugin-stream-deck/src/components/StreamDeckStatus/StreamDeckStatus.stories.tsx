//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { StreamDeckStatus } from './StreamDeckStatus.tsx';

const meta = {
  title: 'plugins/plugin-stream-deck/StreamDeckStatus',
  component: StreamDeckStatus,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  parameters: { translations },
} satisfies Meta<typeof StreamDeckStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithModel: Story = { args: { model: 'Stream Deck +' } };
