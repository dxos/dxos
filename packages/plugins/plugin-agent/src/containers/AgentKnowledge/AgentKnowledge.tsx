//
// Copyright 2026 DXOS.org
//

import React, { useCallback } from 'react';

import type * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj, Relation } from '@dxos/echo';
import { EID } from '@dxos/keys';
import { HasSubject } from '@dxos/types';

import { AgentKnowledge as AgentKnowledgeComponent } from '#components';
import { Goal, Memory } from '#types';

import { useAgentKnowledge } from '../useAgentKnowledge.ts';

export type AgentKnowledgeProps = {
  role?: string;
  agent: Agent.Agent;
};

/** What the agent knows: its active memories, the facts it read, the goals it watches for and its knowledge graph. */
export const AgentKnowledge = ({ role, agent }: AgentKnowledgeProps) => {
  const { memories, facts, goals, nodes, edges } = useAgentKnowledge(agent);

  // Forgets what the space has taught the agent: every memory (with the links to what it is about) and every goal.
  const handleReset = useCallback(async () => {
    const db = Obj.getDatabase(agent);
    if (!db) {
      return;
    }
    const [allMemories, allGoals, links] = await Promise.all([
      db.query(Filter.type(Memory.Memory)).run(),
      db.query(Filter.type(Goal.Goal)).run(),
      db.query(Filter.type(HasSubject.HasSubject)).run(),
    ]);
    const memoryIds = new Set(allMemories.map(({ id }) => id));
    links
      .filter((link) => {
        const uri = Relation.getSourceURI(link);
        const source = uri === undefined ? undefined : EID.tryParse(uri);
        const id = source === undefined ? undefined : EID.getEntityId(source);
        return id !== undefined && memoryIds.has(id);
      })
      .forEach((link) => db.remove(link));
    [...allMemories, ...allGoals].forEach((object) => db.remove(object));
  }, [agent]);

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
