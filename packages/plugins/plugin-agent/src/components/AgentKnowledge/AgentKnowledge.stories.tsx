//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { SCENARIOS, toGraph } from '../AgentState/testing.ts';
import { AgentKnowledge, type AgentKnowledgeChannel, type AgentKnowledgeView } from './AgentKnowledge.tsx';

const CHANNELS: AgentKnowledgeChannel[] = [
  {
    id: 'rich',
    name: 'Rich',
    mode: 'Note-taker',
    skills: [{ key: 'org.dxos.skill.agentNotes', name: 'Note-taker' }],
  },
  { id: 'dima', name: 'Dima', mode: 'Conversation', skills: [] },
];

type StoryProps = {
  /** Named rather than passed as objects, because storybook clones args and ECHO objects reject the writes. */
  scenario: keyof typeof SCENARIOS;
  channels: AgentKnowledgeChannel[];
  defaultView?: AgentKnowledgeView;
};

const DefaultStory = ({ scenario, channels, defaultView }: StoryProps) => {
  const { nodes, edges } = useMemo(() => toGraph(SCENARIOS[scenario]()), [scenario]);
  return (
    <AgentKnowledge.Root defaultView={defaultView}>
      <AgentKnowledge.Conversations channels={channels} />
      <AgentKnowledge.Graph nodes={nodes} edges={edges} />
    </AgentKnowledge.Root>
  );
};

const meta = {
  title: 'plugins/plugin-agent/components/AgentKnowledge',
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
  args: { scenario: 'default', channels: CHANNELS },
};

export const Empty: Story = {
  args: { scenario: 'empty', channels: [] },
};

export const LargeGraph: Story = {
  args: { scenario: 'large', channels: CHANNELS, defaultView: 'graph' },
};
