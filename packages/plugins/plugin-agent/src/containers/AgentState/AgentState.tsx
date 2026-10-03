//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { DXN, Filter, Obj, Query, Ref } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { Organization, Person, Task } from '@dxos/types';

import {
  type AgentStateChannel,
  AgentState as AgentStateComponent,
  type AgentStateCounts,
  type AgentStateSkill,
} from '#components';
import { AgentOperation, ChatParticipant, Goal, Memory, Mode, Profile } from '#types';

/** Statuses after which a task no longer needs doing. */
const CLOSED_TASK_STATUSES: readonly Task.Status[] = ['done', 'duplicate', 'cancelled', 'failed'];

/**
 * The binding entries a chat's feed records; named by typename because the `AiContext` module that
 * defines them carries the heavy session runtime.
 */
const BINDING_TYPE = DXN.make('org.dxos.type.contextBinding', '0.1.0');

/** A memory past its `expiresAt`; memories without one never expire. */
const isExpired = (memory: Memory.Memory, now: string): boolean =>
  'expiresAt' in memory && typeof memory.expiresAt === 'string' && memory.expiresAt <= now;

export type AgentStateProps = {
  role?: string;
  agent: Agent.Agent;
  /** Extra toolbar items, e.g. a story's actions on the agent. */
  actions?: ReactNode;
};

/** What the agent is doing: its identity and mode, counts of what it tracks and the conversations it holds. */
export const AgentState = ({ role, agent, actions }: AgentStateProps) => {
  const db = Obj.getDatabase(agent);
  const [name] = useObject(agent, 'name');
  const [did] = useObject(agent, 'did');

  // Child-of filters rather than `.children()` traversals, which EDGE's query planner cannot run.
  const chatFilter = useMemo(() => Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent)), [agent]);
  // `Filter.and` widens to the child-of filter's untyped result, so the element type is restated here.
  const chats: Chat.Chat[] = useQuery(db, chatFilter);
  const memories = useQuery(db, Filter.type(Memory.Memory));
  const goals = useQuery(db, Filter.type(Goal.Goal));
  const people = useQuery(db, Filter.type(Person.Person));
  const organizations = useQuery(db, Filter.type(Organization.Organization));
  const tasks = useQuery(db, Filter.type(Task.Task));

  // A query re-emits on membership only, so status, title and checklist changes need per-object subscriptions.
  const stateAtom = useMemo(
    () =>
      Atom.make((get) => {
        memories.forEach((memory) => get(Obj.atom(memory)));
        goals.forEach((goal) => get(Obj.atom(goal)));
        people.forEach((person) => get(Obj.atom(person)));
        organizations.forEach((organization) => get(Obj.atom(organization)));
        chats.forEach((chat) => get(Obj.atomProperty(chat, 'tasks')));
        tasks.forEach((task) => get(Obj.atomProperty(task, 'status')));

        const now = new Date().toISOString();
        const current = memories.filter((memory) => memory.status === 'active');
        const expired = current.filter((memory) => isExpired(memory, now));
        const active = current.filter((memory) => !isExpired(memory, now)).sort(Profile.byNewest);

        // The agent's own checklist: tasks its chats carry, matched by id so unloaded refs still count.
        const taskIds = new Set(
          chats.flatMap((chat) => chat.tasks.map((ref) => Task.refEntityId(ref))).filter((id) => id !== undefined),
        );
        const ownTasks = tasks.filter((task) => taskIds.has(task.id));

        const counts: AgentStateCounts = {
          memories: { active: active.length, expired: expired.length },
          goals: {
            proposed: goals.filter((goal) => goal.status === 'proposed').length,
            confirmed: goals.filter((goal) => goal.status === 'confirmed' || goal.status === 'active').length,
          },
          people: people.length,
          organizations: organizations.length,
          conversations: chats.length,
          tasks:
            taskIds.size > 0
              ? {
                  open: ownTasks.filter(
                    (task) => task.status === undefined || !CLOSED_TASK_STATUSES.includes(task.status),
                  ).length,
                  total: taskIds.size,
                }
              : undefined,
        };

        return { counts };
      }),
    [chats, memories, goals, people, organizations, tasks],
  );
  const { counts } = useAtomValue(stateAtom);

  const primary = useMemo(
    () =>
      chats
        // Discord thread chats carry a foreign key and are never the agent's primary conversation.
        .filter((chat) => Obj.getMeta(chat).keys.length === 0)
        .sort((left, right) => left.id.localeCompare(right.id))
        .at(-1),
    [chats],
  );
  const skills = useBoundSkills(agent, primary);
  const channels = useChannels(agent, chats, people);

  return (
    <AgentStateComponent.Root role={role} name={name} actions={actions}>
      <AgentStateComponent.Identity did={did} skills={skills} />
      <AgentStateComponent.Summary counts={counts} />
      <AgentStateComponent.Conversations channels={channels} />
    </AgentStateComponent.Root>
  );
};

AgentState.displayName = 'AgentState';

/**
 * The skills bound to the agent's primary chat. Bindings are resolved by an operation (the binder is
 * heavy), so the list is re-read whenever the chat's feed gains a binding entry.
 */
const useBoundSkills = (agent: Agent.Agent, chat: Chat.Chat | undefined): AgentStateSkill[] => {
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(agent);
  const spaceId = db?.spaceId;
  const [feedRef] = useObject(chat, 'feed');
  const feed = useResolveRef(feedRef);
  const bindingsQuery = useMemo(
    () => (feed ? Query.select(Filter.type(BINDING_TYPE)).from(feed) : Query.select(Filter.nothing())),
    [feed],
  );
  const bindings = useQuery(db, bindingsQuery);
  const [skills, setSkills] = useState<AgentStateSkill[]>([]);

  const refresh = useCallback(async () => {
    if (!spaceId) {
      return;
    }

    const { data } = await invokePromise(AgentOperation.ListSkills, { agent: Ref.make(agent) }, { spaceId });
    // A chat can bind the built-in skill and the agent's space copy under one key; the mode names it once.
    const byKey = new Map((data?.skills ?? []).map(({ key, name }) => [key ?? name, { key: key ?? name, name }]));
    setSkills([...byKey.values()]);
  }, [invokePromise, agent, spaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh, chat?.id, bindings.length]);

  return skills;
};

/**
 * Each of the agent's chats with its current mode and bound skills. The skills are re-read when a
 * chat's mode changes, which is how `switchMode` announces a rebinding.
 */
const useChannels = (
  agent: Agent.Agent,
  chats: readonly Chat.Chat[],
  people: readonly Person.Person[],
): AgentStateChannel[] => {
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
