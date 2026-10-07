//
// Copyright 2026 DXOS.org
//

import React from 'react';

import type * as Agent from '@dxos/assistant/Agent';

import { AgentKnowledge as AgentKnowledgeComponent } from '#components';

import { useAgentKnowledge } from '../useAgentKnowledge.ts';

export type AgentKnowledgeProps = {
  role?: string;
  agent: Agent.Agent;
};

/** What the agent knows: its active memories, the facts it read, the goals it watches for and its knowledge graph. */
export const AgentKnowledge = ({ role, agent }: AgentKnowledgeProps) => {
  const { memories, facts, goals, nodes, edges } = useAgentKnowledge(agent);

  return (
    <AgentKnowledgeComponent.Root role={role}>
      <AgentKnowledgeComponent.Memories memories={memories} />
      <AgentKnowledgeComponent.Facts facts={facts} />
      <AgentKnowledgeComponent.Goals goals={goals} />
      <AgentKnowledgeComponent.Graph nodes={nodes} edges={edges} />
    </AgentKnowledgeComponent.Root>
  );
};

AgentKnowledge.displayName = 'AgentKnowledge';
