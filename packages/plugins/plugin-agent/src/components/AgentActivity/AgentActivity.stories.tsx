//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';
import { type DiscordBinding, type DiscordOperation } from '#types';

import { AgentActivity } from './AgentActivity.tsx';

const NOW = new Date('2026-10-03T12:00:00Z');

type Conversation = { id: string; title: string; lastActivity?: string };

const THREADS: Conversation[] = [
  { id: 'thread-3', title: 'Launch checklist', lastActivity: '2026-10-03T11:52:00Z' },
  { id: 'thread-2', title: 'Hiring plan', lastActivity: '2026-10-03T08:15:00Z' },
  { id: 'thread-1', title: 'Discord bot on EDGE', lastActivity: '2026-09-28T16:40:00Z' },
];

const BINDING: Partial<DiscordBinding.Properties> = {
  applicationId: '1234567890',
  guildId: '9988776655',
  channels: ['1122334455'],
};

type StoryProps = {
  bound: boolean;
  values?: Partial<DiscordBinding.Properties>;
  status?: DiscordOperation.BotStatus;
  error?: string;
  conversations: Conversation[];
};

const DefaultStory = ({ bound, values, status, error, conversations }: StoryProps) => (
  <AgentActivity.Root bound={bound} running={status?.running}>
    <AgentActivity.Discord bound={bound} values={values} status={status} error={error} />
    <AgentActivity.Conversations>
      {conversations.map((conversation) => (
        <AgentActivity.Conversation key={conversation.id} {...conversation} now={NOW} />
      ))}
    </AgentActivity.Conversations>
  </AgentActivity.Root>
);

const meta = {
  title: 'plugins/plugin-agent/components/AgentActivity',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    bound: true,
    values: BINDING,
    status: { running: true, gateway: 'ready', botUserId: '42', threads: THREADS.length },
    conversations: THREADS,
  },
};

export const NotConfigured: Story = {
  args: {
    bound: false,
    conversations: [],
  },
};

export const Failed: Story = {
  name: 'Error',
  args: {
    bound: true,
    values: BINDING,
    status: { running: true, gateway: 'failed', threads: 1, lastError: 'Authentication failed (4004).' },
    error: 'Failed to fetch',
    conversations: THREADS.slice(2),
  },
};

export const Connecting: Story = {
  args: {
    bound: true,
    values: BINDING,
    status: { running: true, gateway: 'connecting', threads: 0 },
    conversations: [],
  },
};
