//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj, Ref } from '@dxos/echo';

import { type AgentKnowledgeBrainStatus, AgentKnowledge as AgentKnowledgeComponent } from '#components';
import { Goal, TriggerOperation } from '#types';

import { useAgentKnowledge } from '../useAgentKnowledge.ts';
import { useRemoteBrain } from '../useBrainLocation.ts';

const RESETTING: AgentKnowledgeBrainStatus = { state: 'resetting' };

export type AgentKnowledgeProps = {
  role?: string;
  agent: Agent.Agent;
};

/** What the agent knows: its active memories, the facts it read, the goals it watches for and its knowledge graph. */
export const AgentKnowledge = ({ role, agent }: AgentKnowledgeProps) => {
  const { memories, facts, goals, nodes, edges, brain, refresh } = useAgentKnowledge(agent);
  const { invokePromise } = Hooks.useOperationInvoker();
  const remote = useRemoteBrain(agent);
  // A reset on EDGE takes seconds, so the views say so rather than show the brain about to be wiped.
  const [resetting, setResetting] = useState(false);

  // Wipes what the space has taught the agent: its whole brain (memories, facts, read cursors), and every goal.
  const handleReset = useCallback(async () => {
    const db = Obj.getDatabase(agent);
    if (!db) {
      return;
    }
    setResetting(true);
    try {
      const { error } = await invokePromise(
        TriggerOperation.ResetBrain,
        { agent: Ref.make(agent) },
        { spaceId: db.spaceId, ...(remote ? { on: 'edge' as const } : {}) },
      );
      // A reset that could not wipe the brain keeps the goals too, rather than half-reset the agent.
      if (error) {
        return;
      }
      const allGoals = await db.query(Filter.type(Goal.Goal)).run();
      allGoals.forEach((goal) => db.remove(goal));
    } finally {
      setResetting(false);
      refresh();
    }
  }, [agent, invokePromise, remote, refresh]);

  return (
    <AgentKnowledgeComponent.Root
      role={role}
      brain={resetting ? RESETTING : brain}
      onReset={resetting ? undefined : () => void handleReset()}
    >
      <AgentKnowledgeComponent.Memories memories={memories} />
      <AgentKnowledgeComponent.Facts facts={facts} />
      <AgentKnowledgeComponent.Goals goals={goals} />
      <AgentKnowledgeComponent.Graph nodes={nodes} edges={edges} />
    </AgentKnowledgeComponent.Root>
  );
};

AgentKnowledge.displayName = 'AgentKnowledge';
