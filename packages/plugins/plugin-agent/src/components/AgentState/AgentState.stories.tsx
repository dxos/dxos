//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { AgentState, type AgentStateChannel, type AgentStateCounts, type AgentStateSkill } from './AgentState.tsx';
import { type Knowledge, SCENARIOS } from './testing.ts';

const SKILLS: AgentStateSkill[] = [
  { key: 'org.dxos.skill.agentConversation', name: 'Agent conversation' },
  { key: 'org.dxos.skill.interview', name: 'Interview' },
];

const countsOf = ({ people, organizations, goals, memories }: Knowledge): AgentStateCounts => ({
  memories: { active: memories.length, expired: 0 },
  goals: {
    proposed: goals.filter((goal) => goal.status === 'proposed').length,
    confirmed: goals.filter((goal) => goal.status === 'confirmed').length,
  },
  people: people.length,
  organizations: organizations.length,
  conversations: 2,
  tasks: { open: 1, total: 3 },
});

const CHANNELS: AgentStateChannel[] = [
  {
    id: 'rich',
    name: 'Rich',
    mode: 'Note-taker',
    skills: [{ key: 'org.dxos.skill.agentNotes', name: 'Note-taker' }],
  },
  { id: 'dima', name: 'Dima', mode: 'Conversation', skills: [] },
];

type StoryProps = {
  name?: string;
  did?: string;
  skills: AgentStateSkill[];
  /** Named rather than passed as objects, because storybook clones args and ECHO objects reject the writes. */
  scenario: keyof typeof SCENARIOS;
  counts?: AgentStateCounts;
  channels?: AgentStateChannel[];
};

const DefaultStory = ({ name, did, skills, scenario, counts, channels = [] }: StoryProps) => {
  const knowledge = useMemo(() => SCENARIOS[scenario](), [scenario]);
  return (
    <AgentState.Root name={name}>
      <AgentState.Identity did={did} skills={skills} />
      <AgentState.Summary counts={counts ?? countsOf(knowledge)} />
      <AgentState.Conversations channels={channels} />
    </AgentState.Root>
  );
};

const meta = {
  title: 'plugins/plugin-agent/components/AgentState',
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
    name: 'Interlocutor',
    did: 'did:halo:9f2c4e1a7b3d5f6e8a0c2b4d6f8e0a1c',
    skills: SKILLS,
    scenario: 'default',
    channels: CHANNELS,
  },
};

export const Empty: Story = {
  args: {
    skills: [],
    scenario: 'empty',
    counts: {
      memories: { active: 0, expired: 0 },
      goals: { proposed: 0, confirmed: 0 },
      people: 0,
      organizations: 0,
      conversations: 0,
    },
  },
};
