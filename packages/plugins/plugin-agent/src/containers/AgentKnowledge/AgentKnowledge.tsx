//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useMemo } from 'react';

import type * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj, Relation } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { HasSubject, Organization, Person } from '@dxos/types';

import {
  AgentKnowledge as AgentKnowledgeComponent,
  type AgentKnowledgeEdge,
  type AgentKnowledgeFact,
  type AgentKnowledgeNode,
} from '#components';
import { FactEntry, Goal, Memory, Profile } from '#types';

import { useFactEntries } from '../useFactEntries.ts';

/** A memory past its `expiresAt`; memories without one never expire. */
const isExpired = (memory: Memory.Memory, now: string): boolean =>
  'expiresAt' in memory && typeof memory.expiresAt === 'string' && memory.expiresAt <= now;

export type AgentKnowledgeProps = {
  role?: string;
  agent: Agent.Agent;
};

/** What the agent knows: its active memories, the facts it read and its knowledge graph. */
export const AgentKnowledge = ({ role, agent }: AgentKnowledgeProps) => {
  const db = Obj.getDatabase(agent);
  const [name] = useObject(agent, 'name');

  const memories = useQuery(db, Filter.type(Memory.Memory));
  const goals = useQuery(db, Filter.type(Goal.Goal));
  const people = useQuery(db, Filter.type(Person.Person));
  const organizations = useQuery(db, Filter.type(Organization.Organization));
  const subjects = useQuery(db, Filter.type(HasSubject.HasSubject));

  // A query re-emits on membership only, so status and title changes need per-object subscriptions.
  const graphAtom = useMemo(
    () =>
      Atom.make((get) => {
        memories.forEach((memory) => get(Obj.atom(memory)));
        goals.forEach((goal) => get(Obj.atom(goal)));
        people.forEach((person) => get(Obj.atom(person)));
        organizations.forEach((organization) => get(Obj.atom(organization)));

        const now = new Date().toISOString();
        const active = memories
          .filter((memory) => memory.status === 'active' && !isExpired(memory, now))
          .sort(Profile.byNewest);

        const liveGoals = goals.filter(Profile.isLiveGoal);
        const entities = [...people, ...organizations];
        const nodes: AgentKnowledgeNode[] =
          entities.length + liveGoals.length + active.length === 0
            ? []
            : [
                { id: agent.id, label: name || 'Agent', object: agent },
                ...entities.map((entity) => ({ id: entity.id, label: Profile.displayName(entity), object: entity })),
                ...liveGoals.map((goal) => ({ id: goal.id, label: goal.title, object: goal })),
                ...active.map((memory) => ({ id: memory.id, label: memory.content, object: memory })),
              ];
        const edges: AgentKnowledgeEdge[] = [
          ...entities.map((entity): AgentKnowledgeEdge => ({ source: agent.id, target: entity.id, kind: 'knows' })),
          ...liveGoals.flatMap((goal) =>
            entities
              .filter((entity) => goal.owners.some((owner) => Profile.refersTo(owner, entity.id)))
              .map((entity): AgentKnowledgeEdge => ({ source: goal.id, target: entity.id, kind: 'owner' })),
          ),
          ...subjects.flatMap((relation): AgentKnowledgeEdge[] => {
            // Read from the URIs so an endpoint that has not loaded yet does not throw.
            const source = EID.tryParse(Relation.getSourceURI(relation));
            const target = EID.tryParse(Relation.getTargetURI(relation));
            const sourceId = source && EID.getEntityId(source);
            const targetId = target && EID.getEntityId(target);
            return sourceId && targetId ? [{ source: sourceId, target: targetId, kind: 'subject' }] : [];
          }),
        ];

        return { memories: active, nodes, edges };
      }),
    [agent, name, memories, goals, people, organizations, subjects],
  );
  const { memories: active, nodes, edges } = useAtomValue(graphAtom);

  // Feed items are immutable, so the entries query alone tracks every change.
  const { entries } = useFactEntries(agent);
  const facts = useMemo(
    () =>
      entries
        .flatMap((entry) =>
          entry.facts.map((fact): AgentKnowledgeFact => ({
            id: `${entry.id}:${fact.id}`,
            text: FactEntry.factText(fact),
            source: entry.name,
            speaker: fact.attribution.agent,
            saidAt: fact.attribution.generatedAtTime,
          })),
        )
        .sort((left, right) => right.saidAt.localeCompare(left.saidAt)),
    [entries],
  );

  return (
    <AgentKnowledgeComponent.Root role={role}>
      <AgentKnowledgeComponent.Memories memories={active} />
      <AgentKnowledgeComponent.Facts facts={facts} />
      <AgentKnowledgeComponent.Graph nodes={nodes} edges={edges} />
    </AgentKnowledgeComponent.Root>
  );
};

AgentKnowledge.displayName = 'AgentKnowledge';
