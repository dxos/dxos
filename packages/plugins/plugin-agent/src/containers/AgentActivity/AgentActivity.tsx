//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import type * as Skill from '@dxos/compute/Skill';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { type Channel, Message } from '@dxos/types';

import { AgentActivity as AgentActivityComponent } from '#components';
import { AgentChannels, AgentOperation } from '#types';

import { useAgentChannelList, useAgentConversations } from '../useAgentConversations.ts';

export type AgentActivityProps = {
  role?: string;
  agent: Agent.Agent;
};

/** The Agent's main article: the channels it converses in (with each backend's settings), its skills and its conversations. */
export const AgentActivity = ({ role, agent }: AgentActivityProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(agent);

  const list = useAgentChannelList(agent);
  const [values] = useObject(list);
  const conversations = useAgentConversations(agent);

  const handleSave = useCallback(
    ({ channels }: AgentChannels.Properties) => {
      if (list) {
        Obj.update(list, (list) => {
          list.channels = [...channels];
        });
      } else {
        db?.add(AgentChannels.make({ agent, channels }));
      }
    },
    [db, list, agent],
  );

  const handleSelect = useCallback(
    (id: string) => {
      const chat = conversations.find((chat) => chat.id === id);
      if (chat) {
        void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(chat)] });
      }
    },
    [conversations, invokePromise],
  );

  const skills = useAgentSkills(agent);

  return (
    <AgentActivityComponent.Root role={role}>
      <AgentActivityComponent.Channels db={db} values={values ?? { channels: [] }} onSave={handleSave}>
        {(values?.channels ?? []).map((ref) => (
          <ChannelSettings key={ref.uri} channel={ref} />
        ))}
      </AgentActivityComponent.Channels>
      <AgentActivityComponent.Skills ids={skills.skills.map((skill) => skill.key)}>
        {skills.skills.map(({ key, name, customized }) => (
          <AgentActivityComponent.Skill
            key={key}
            id={key}
            name={name}
            customized={customized}
            busy={skills.busy}
            onOpen={skills.open}
            onCustomize={skills.customize}
            onReset={skills.reset}
          />
        ))}
      </AgentActivityComponent.Skills>
      <AgentActivityComponent.Conversations ids={conversations.map((chat) => chat.id)}>
        {conversations.map((chat) => (
          <ConversationTile key={chat.id} chat={chat} onSelect={handleSelect} />
        ))}
      </AgentActivityComponent.Conversations>
    </AgentActivityComponent.Root>
  );
};

/** The channel's backend settings, from whichever plugin owns its backend (e.g. the Discord bot). */
const ChannelSettings = ({ channel: ref }: { channel: Ref.Ref<Channel.Channel> }) => {
  const channel = useResolveRef(ref);
  const data = useMemo<AppSurface.ObjectPropertiesData | undefined>(
    () => (channel ? { subject: channel } : undefined),
    [channel],
  );
  return data ? <Surface.Surface type={AppSurface.ObjectProperties} data={data} /> : null;
};

AgentActivity.displayName = 'AgentActivity';

type ConversationTileProps = {
  chat: Chat.Chat;
  onSelect: (id: string) => void;
};

/** Owns the subscriptions to one chat's name and feed, so a new message re-renders only its own row. */
const ConversationTile = ({ chat, onSelect }: ConversationTileProps) => {
  const [name] = useObject(chat, 'name');
  const [feedRef] = useObject(chat, 'feed');
  const feed = useResolveRef(feedRef);
  const query = useMemo(
    () => (feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing())),
    [feed],
  );
  const messages = useQuery(Obj.getDatabase(chat), query);
  const lastActivity = useMemo(
    () =>
      messages.reduce<string | undefined>(
        (latest, message) => (latest === undefined || message.created > latest ? message.created : latest),
        undefined,
      ),
    [messages],
  );

  return (
    <AgentActivityComponent.Conversation id={chat.id} title={name} lastActivity={lastActivity} onSelect={onSelect} />
  );
};

type ListedSkill = { key: string; name: string; customized: boolean; skill?: Ref.Ref<Skill.Skill> };

/**
 * The plugin skills the agent's conversation binds, with customize/reset/open. Bindings live in the chat's
 * feed and are read through an operation, so the list is re-read after each change rather than subscribed.
 */
const useAgentSkills = (agent: Agent.Agent) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(agent);
  const spaceId = db?.spaceId;
  const [skills, setSkills] = useState<ListedSkill[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!spaceId) {
      return;
    }

    const { data } = await invokePromise(AgentOperation.ListSkills, { agent: Ref.make(agent) }, { spaceId });
    // Space-authored skills have no registry key and are edited where they live, not here.
    setSkills(
      (data?.skills ?? []).flatMap(({ key, name, customized, skill }) =>
        key ? [{ key, name, customized, skill }] : [],
      ),
    );
  }, [invokePromise, agent, spaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = useCallback(
    async (operation: typeof AgentOperation.CustomizeSkill | typeof AgentOperation.ResetSkill, key: string) => {
      if (!spaceId) {
        return;
      }

      setBusy(true);
      await invokePromise(operation, { agent: Ref.make(agent), skill: key }, { spaceId });
      await refresh();
      setBusy(false);
    },
    [invokePromise, agent, spaceId, refresh],
  );

  const customize = useCallback((key: string) => void run(AgentOperation.CustomizeSkill, key), [run]);
  const reset = useCallback((key: string) => void run(AgentOperation.ResetSkill, key), [run]);

  const open = useCallback(
    async (key: string) => {
      const ref = skills.find((skill) => skill.key === key)?.skill;
      if (!ref || !db) {
        return;
      }

      // The listed ref crossed the operation boundary without a resolver, so it is re-made on the database.
      const skill = await db.makeRef<Skill.Skill>(ref.uri).load();
      await invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(skill)] });
    },
    [skills, db, invokePromise],
  );

  return { skills, busy, customize, reset, open };
};
