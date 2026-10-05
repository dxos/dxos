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

type SkillRow = { id: string; name: string; customized: boolean };

const SKILLS: SkillRow[] = [
  { id: 'org.dxos.skill.agentConversation', name: 'Agent conversation', customized: false },
  { id: 'org.dxos.skill.interview', name: 'Interview', customized: true },
];

type StoryProps = {
  conversations: Conversation[];
  skills?: SkillRow[];
};

const DefaultStory = ({ conversations, skills = [] }: StoryProps) => (
  <AgentActivity.Root>
    <AgentActivity.Channels values={{ channels: [] }} />
    <SkillList initial={skills} />
    <AgentActivity.Conversations ids={conversations.map((conversation) => conversation.id)}>
      {conversations.map((conversation) => (
        <AgentActivity.Conversation key={conversation.id} {...conversation} now={NOW} />
      ))}
    </AgentActivity.Conversations>
  </AgentActivity.Root>
);

/** Customize/Reset toggle the row locally, standing in for the operations the container invokes. */
const SkillList = ({ initial }: { initial: SkillRow[] }) => {
  const [skills, setSkills] = useState(initial);
  const setCustomized = (id: string, customized: boolean) =>
    setSkills((skills) => skills.map((skill) => (skill.id === id ? { ...skill, customized } : skill)));
  return (
    <AgentActivity.Skills ids={skills.map((skill) => skill.id)}>
      {skills.map((skill) => (
        <AgentActivity.Skill
          key={skill.id}
          {...skill}
          onCustomize={(id) => setCustomized(id, true)}
          onReset={(id) => setCustomized(id, false)}
        />
      ))}
    </AgentActivity.Skills>
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
    skills: SKILLS,
  },
};

export const Empty: Story = {
  args: {
    conversations: [],
  },
};
