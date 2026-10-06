//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DiscordBotStatus } from './DiscordBotStatus.tsx';

const meta = {
  title: 'plugins/plugin-discord/components/DiscordBotStatus',
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
    status: { running: true, state: 'ready', detail: '3 threads' },
  },
};

export const Failed: Story = {
  args: {
    status: { running: true, state: 'failed', detail: '0 threads', error: 'Authentication failed (4004).' },
  },
};

export const OtherConfig: Story = {
  args: {
    status: { running: true, state: 'other-config', detail: '1 thread' },
  },
};

export const Checking: Story = {
  args: {},
};
