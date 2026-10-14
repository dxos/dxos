//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj, Ref } from '@dxos/echo';

import { AgentKnowledge as AgentKnowledgeComponent } from '#components';
import { Goal, MemoryOperation } from '#types';

import { useAgentKnowledge } from '../useAgentKnowledge.ts';
import { useRemoteBrain } from '../useBrainLocation.ts';

export type AgentKnowledgeProps = {
  role?: string;
  agent: Agent.Agent;
};

/** What the agent knows: its active memories, the facts it read, the goals it watches for and its knowledge graph. */
export const AgentKnowledge = ({ role, agent }: AgentKnowledgeProps) => {
  const { memories, facts, goals, nodes, edges } = useAgentKnowledge(agent);
  const { invokePromise } = Hooks.useOperationInvoker();
  const remote = useRemoteBrain(agent);

  // Forgets what the space has taught the agent: every memory in its brain, and every goal.
  const handleReset = useCallback(async () => {
    const db = Obj.getDatabase(agent);
    if (!db) {
      return;
    }
    const { error } = await invokePromise(
      MemoryOperation.Forget,
      { agent: Ref.make(agent) },
      { spaceId: db.spaceId, ...(remote ? { on: 'edge' as const } : {}) },
    );
    // A reset that could not forget the memories keeps the goals too, rather than half-reset the agent.
    if (error) {
      return;
    }
    const allGoals = await db.query(Filter.type(Goal.Goal)).run();
    allGoals.forEach((goal) => db.remove(goal));
  }, [agent, invokePromise, remote]);

  return (
    <AgentKnowledgeComponent.Root role={role} onReset={() => void handleReset()}>
      <AgentKnowledgeComponent.Memories memories={memories} />
      <AgentKnowledgeComponent.Facts facts={facts} />
      <AgentKnowledgeComponent.Goals goals={goals} />
      <AgentKnowledgeComponent.Graph nodes={nodes} edges={edges} />
    </AgentKnowledgeComponent.Root>
  );
};

AgentKnowledge.displayName = 'AgentKnowledge';
