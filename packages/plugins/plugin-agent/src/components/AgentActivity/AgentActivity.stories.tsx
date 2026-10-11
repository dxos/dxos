//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { AgentActivity } from './AgentActivity.tsx';

const NOW = new Date('2026-10-03T12:00:00Z');

type Conversation = { id: string; title: string; lastActivity?: string };

const THREADS: Conversation[] = [
  { id: 'thread-3', title: 'Launch checklist', lastActivity: '2026-10-03T11:52:00Z' },
  { id: 'thread-2', title: 'Hiring plan', lastActivity: '2026-10-03T08:15:00Z' },
  { id: 'thread-1', title: 'Discord bot on EDGE', lastActivity: '2026-09-28T16:40:00Z' },
];

type Row = { id: string; name: string };

const CHANNELS: Row[] = [{ id: 'channel-1', name: 'test-bot' }];

const SKILLS: Row[] = [
  { id: 'org.dxos.skill.agentConversation', name: 'Agent conversation' },
  { id: 'org.dxos.skill.agentSupport', name: 'Community support' },
];

type StoryProps = {
  conversations: Conversation[];
  channels?: Row[];
  skills?: Row[];
};

/** Remove and Delete drop the row locally, standing in for the object removal the container performs. */
const DefaultStory = ({
  conversations: initialConversations,
  channels: initialChannels = [],
  skills = [],
}: StoryProps) => {
  const [channels, setChannels] = useState(initialChannels);
  const [conversations, setConversations] = useState(initialConversations);
  return (
    <AgentActivity.Root toolbar={<AgentActivity.Toolbar />}>
      <AgentActivity.Channels ids={channels.map((channel) => channel.id)}>
        {channels.map((channel) => (
          <AgentActivity.Channel
            key={channel.id}
            {...channel}
            onRemove={(id) => setChannels((rows) => rows.filter((row) => row.id !== id))}
          />
        ))}
      </AgentActivity.Channels>
      <AgentActivity.Skills ids={skills.map((skill) => skill.id)}>
        {skills.map((skill) => (
          <AgentActivity.Skill key={skill.id} {...skill} />
        ))}
      </AgentActivity.Skills>
      <AgentActivity.Conversations ids={conversations.map((conversation) => conversation.id)}>
        {conversations.map((conversation) => (
          <AgentActivity.Conversation
            key={conversation.id}
            {...conversation}
            now={NOW}
            onDelete={(id) => setConversations((rows) => rows.filter((row) => row.id !== id))}
          />
        ))}
      </AgentActivity.Conversations>
    </AgentActivity.Root>
  );
};

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
    conversations: THREADS,
    channels: CHANNELS,
    skills: SKILLS,
  },
};

export const Empty: Story = {
  args: {
    conversations: [],
  },
};
