//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DiscordBotStatus } from './DiscordBotStatus.tsx';

const meta = {
  title: 'plugins/plugin-interlocutor/components/DiscordBotStatus',
  component: DiscordBotStatus,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DiscordBotStatus>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    status: { running: true, gateway: 'ready', botUserId: '42', threads: 3 },
  },
};

export const Failed: Story = {
  args: {
    status: { running: true, gateway: 'failed', threads: 0, lastError: 'Authentication failed (4004).' },
  },
};

export const Checking: Story = {
  args: {},
};
