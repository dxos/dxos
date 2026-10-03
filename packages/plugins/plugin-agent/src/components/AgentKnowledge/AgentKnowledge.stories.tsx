//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { NOW, SCENARIOS, toGraph } from '../AgentState/testing.ts';
import { AgentKnowledge, type AgentKnowledgeView } from './AgentKnowledge.tsx';

type StoryProps = {
  /** Named rather than passed as objects, because storybook clones args and ECHO objects reject the writes. */
  scenario: keyof typeof SCENARIOS;
  defaultView?: AgentKnowledgeView;
};

const DefaultStory = ({ scenario, defaultView }: StoryProps) => {
  const knowledge = useMemo(() => SCENARIOS[scenario](), [scenario]);
  const { nodes, edges } = useMemo(() => toGraph(knowledge), [knowledge]);
  return (
    <AgentKnowledge.Root defaultView={defaultView}>
      <AgentKnowledge.Memories memories={knowledge.memories.map(({ memory }) => memory)} now={NOW} />
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
  args: { scenario: 'default' },
};

export const Empty: Story = {
  args: { scenario: 'empty' },
};

export const LargeGraph: Story = {
  args: { scenario: 'large', defaultView: 'graph' },
};
