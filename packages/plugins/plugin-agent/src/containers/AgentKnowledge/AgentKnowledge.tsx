//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { Filter, Obj, Ref, Relation } from '@dxos/echo';
import { useObject, useQuery } from '@dxos/echo-react';
import { EID } from '@dxos/keys';
import { HasSubject, Organization, Person } from '@dxos/types';

import {
  type AgentKnowledgeChannel,
  AgentKnowledge as AgentKnowledgeComponent,
  type AgentKnowledgeEdge,
  type AgentKnowledgeNode,
  type AgentStateSkill,
} from '#components';
import { AgentOperation, ChatParticipant, Goal, Memory, Mode, Profile } from '#types';

/** A memory past its `expiresAt`; memories without one never expire. */
const isExpired = (memory: Memory.Memory, now: string): boolean =>
  'expiresAt' in memory && typeof memory.expiresAt === 'string' && memory.expiresAt <= now;

export type AgentKnowledgeProps = {
  role?: string;
  agent: Agent.Agent;
};

/** What the agent knows: the conversations it holds (with their modes) and its knowledge graph. */
export const AgentKnowledge = ({ role, agent }: AgentKnowledgeProps) => {
  const db = Obj.getDatabase(agent);
  const [name] = useObject(agent, 'name');

  // Child-of filters rather than `.children()` traversals, which EDGE's query planner cannot run.
  const chatFilter = useMemo(() => Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent)), [agent]);
  // `Filter.and` widens to the child-of filter's untyped result, so the element type is restated here.
  const chats: Chat.Chat[] = useQuery(db, chatFilter);
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
        const active = memories.filter((memory) => memory.status === 'active' && !isExpired(memory, now));

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

        return { nodes, edges };
      }),
    [agent, name, memories, goals, people, organizations, subjects],
  );
  const { nodes, edges } = useAtomValue(graphAtom);
  const channels = useChannels(agent, chats, people);

  return (
    <AgentKnowledgeComponent.Root role={role}>
      <AgentKnowledgeComponent.Conversations channels={channels} />
      <AgentKnowledgeComponent.Graph nodes={nodes} edges={edges} />
    </AgentKnowledgeComponent.Root>
  );
};

AgentKnowledge.displayName = 'AgentKnowledge';

/**
 * Each of the agent's chats with its current mode and bound skills. The skills are re-read when a
 * chat's mode changes, which is how `switchMode` announces a rebinding.
 */
const useChannels = (
  agent: Agent.Agent,
  chats: readonly Chat.Chat[],
  people: readonly Person.Person[],
): AgentKnowledgeChannel[] => {
  const { invokePromise } = useOperationInvoker();
  const spaceId = Obj.getDatabase(agent)?.spaceId;

  // Annotations are object state, so each chat is subscribed to see its mode and participant change.
  const headersAtom = useMemo(
    () =>
      Atom.make((get) =>
        [...chats]
          .sort((left, right) => left.id.localeCompare(right.id))
          .map((chat) => {
            get(Obj.atom(chat));
            const participant = ChatParticipant.get(chat);
            const person = participant ? people.find((person) => person.id === participant) : undefined;
            return {
              id: chat.id,
              name: person ? Profile.displayName(person) : chat.name,
              mode: Mode.getCurrent(chat),
            };
          }),
      ),
    [chats, people],
  );
  const headers = useAtomValue(headersAtom);
  const [skills, setSkills] = useState<Record<string, AgentStateSkill[]>>({});

  const signature = headers.map(({ id, mode }) => `${id}:${mode}`).join(',');
  useEffect(() => {
    if (!spaceId) {
      return;
    }

    let cancelled = false;
    void Promise.all(
      chats.map(async (chat) => {
        const { data } = await invokePromise(
          AgentOperation.ListSkills,
          { agent: Ref.make(agent), chat: Ref.make(chat) },
          { spaceId },
        );
        return [chat.id, (data?.skills ?? []).map(({ key, name }) => ({ key: key ?? name, name }))] as const;
      }),
    ).then((entries) => {
      if (!cancelled) {
        setSkills(Object.fromEntries(entries));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [invokePromise, agent, spaceId, signature]);

  return useMemo(() => headers.map((header) => ({ ...header, skills: skills[header.id] ?? [] })), [headers, skills]);
};
