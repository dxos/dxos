//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import type * as Agent from '@dxos/assistant/Agent';
import { Filter, Obj, type Ref, Relation } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { HasSubject, Organization, Person } from '@dxos/types';

import {
  type AgentKnowledgeEdge,
  type AgentKnowledgeFact,
  type AgentKnowledgeGoal,
  type AgentKnowledgeNode,
} from '#components';
import { FactEntry, Goal, Memory, Profile } from '#types';

import { useFactEntries } from './useFactEntries.ts';
import { useTriggers } from './useTriggers.ts';

/** Live goals first, then the ones that ran their course. */
const GOAL_ORDER: readonly Goal.Status[] = ['active', 'confirmed', 'proposed', 'achieved', 'dropped'];

/** A memory past its `expiresAt`; memories without one never expire. */
const isExpired = (memory: Memory.Memory, now: string): boolean =>
  'expiresAt' in memory && typeof memory.expiresAt === 'string' && memory.expiresAt <= now;

export type AgentKnowledgeData = {
  memories: Memory.Memory[];
  facts: AgentKnowledgeFact[];
  goals: AgentKnowledgeGoal[];
  nodes: AgentKnowledgeNode[];
  edges: AgentKnowledgeEdge[];
};

/** What the agent knows, derived for display: its active memories, the facts it read, its goals and its knowledge graph. */
export const useAgentKnowledge = (agent: Agent.Agent): AgentKnowledgeData => {
  const db = Obj.getDatabase(agent);
  const [name] = useObject(agent, 'name');

  const memories = useQuery(db, Filter.type(Memory.Memory));
  const goals = useQuery(db, Filter.type(Goal.Goal));
  const people = useQuery(db, Filter.type(Person.Person));
  const organizations = useQuery(db, Filter.type(Organization.Organization));
  const subjects = useQuery(db, Filter.type(HasSubject.HasSubject));
  const triggers = useTriggers(agent);

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

        const nameOf = (ref: Ref.Unknown): string | undefined => {
          const entity = entities.find((entity) => Profile.refersTo(ref, entity.id));
          return entity && Profile.displayName(entity);
        };
        const goalItems: AgentKnowledgeGoal[] = [...goals]
          .sort((left, right) => GOAL_ORDER.indexOf(left.status) - GOAL_ORDER.indexOf(right.status))
          .map((goal) => ({
            id: goal.id,
            title: goal.title,
            status: goal.status,
            owners:
              goal.owners
                .map(nameOf)
                .filter((owner) => owner !== undefined)
                .join(', ') || undefined,
            watches: triggers
              .filter((trigger) => trigger.goal && Profile.refersTo(trigger.goal, goal.id))
              .map(({ id, when, recipient, message }) => ({ id, when, recipient: nameOf(recipient), message })),
          }));

        return { memories: active, nodes, edges, goals: goalItems };
      }),
    [agent, name, memories, goals, people, organizations, subjects, triggers],
  );
  const { memories: active, nodes, edges, goals: goalItems } = useAtomValue(graphAtom);

  // Feed items are immutable, so the entries query alone tracks every change.
  const { facts: recorded } = useFactEntries(agent);
  const facts = useMemo(
    () =>
      recorded
        .map(({ entry, fact, pass }): AgentKnowledgeFact => ({
          id: entry.id,
          text: FactEntry.factText(fact),
          source: pass.name,
          speaker: fact.attribution.agent,
          saidAt: fact.attribution.generatedAtTime,
        }))
        .sort((left, right) => right.saidAt.localeCompare(left.saidAt)),
    [recorded],
  );

  return { memories: active, facts, goals: goalItems, nodes, edges };
};
