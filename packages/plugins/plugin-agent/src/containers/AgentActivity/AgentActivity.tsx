//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import type * as Skill from '@dxos/compute/Skill';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { type Channel, Message } from '@dxos/types';

import { AgentActivity as AgentActivityComponent } from '#components';
import { AgentOperation } from '#types';

import { useAgentChannelList, useAgentConversations } from '../useAgentConversations.ts';
import { selectPrimaryChat, useBindingCount } from '../useSkillBindings.ts';

export type AgentActivityProps = {
  role?: string;
  agent: Agent.Agent;
  attendableId?: string;
};

/** The Agent's main article: the channels it converses in (with each backend's settings), its skills and its conversations. */
export const AgentActivity = ({ role, agent, attendableId }: AgentActivityProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(agent);

  const list = useAgentChannelList(agent);
  const [values] = useObject(list);
  const channels = values?.channels ?? [];
  const conversations = useAgentConversations(agent);

  const handleRemoveChannel = useCallback(
    (uri: string) => {
      if (list) {
        Obj.update(list, (list) => {
          list.channels = list.channels.filter((ref) => ref.uri !== uri);
        });
      }
    },
    [list],
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

  // The channel opens a fresh conversation on its next message, so deleting one only clears its history here.
  const handleDelete = useCallback(
    (id: string) => {
      const chat = conversations.find((chat) => chat.id === id);
      if (chat) {
        db?.remove(chat);
      }
    },
    [conversations, db],
  );

  const skills = useAgentSkills(agent);

  return (
    <AgentActivityComponent.Root
      role={role}
      toolbar={<AgentActivityComponent.Toolbar attendableId={attendableId} onRefresh={skills.refresh} />}
    >
      <AgentActivityComponent.Channels
        ids={channels.map((ref) => ref.uri)}
        settings={channels.map((ref) => (
          <ChannelSettings key={ref.uri} channel={ref} />
        ))}
      >
        {channels.map((ref) => (
          <ChannelTile key={ref.uri} channel={ref} onRemove={handleRemoveChannel} />
        ))}
      </AgentActivityComponent.Channels>
      <AgentActivityComponent.Skills ids={skills.skills.map((skill) => skill.key)}>
        {skills.skills.map(({ key, name, customized }) => (
          <AgentActivityComponent.Skill key={key} id={key} name={name} onOpen={customized ? skills.open : undefined} />
        ))}
      </AgentActivityComponent.Skills>
      <AgentActivityComponent.Conversations ids={conversations.map((chat) => chat.id)}>
        {conversations.map((chat) => (
          <ConversationTile key={chat.id} chat={chat} onSelect={handleSelect} onDelete={handleDelete} />
        ))}
      </AgentActivityComponent.Conversations>
    </AgentActivityComponent.Root>
  );
};

/** One channel row, named by the channel its ref resolves to. */
const ChannelTile = ({
  channel: ref,
  onRemove,
}: {
  channel: Ref.Ref<Channel.Channel>;
  onRemove: (uri: string) => void;
}) => {
  const channel = useResolveRef(ref);
  return <AgentActivityComponent.Channel id={ref.uri} name={channel?.name} onRemove={onRemove} />;
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
  onDelete: (id: string) => void;
};

/** Owns the subscriptions to one chat's name and feed, so a new message re-renders only its own row. */
const ConversationTile = ({ chat, onSelect, onDelete }: ConversationTileProps) => {
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
    <AgentActivityComponent.Conversation
      id={chat.id}
      title={name}
      lastActivity={lastActivity}
      onSelect={onSelect}
      onDelete={onDelete}
    />
  );
};

type ListedSkill = { key: string; name: string; customized: boolean; skill?: Ref.Ref<Skill.Skill> };

/**
 * The plugin skills the agent's conversation binds; a customized one opens for editing. Bindings live in the chat's
 * feed and are read through an operation, so the list is re-read whenever the feed gains a binding entry —
 * a mode switch from anywhere.
 */
const useAgentSkills = (agent: Agent.Agent) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const db = Obj.getDatabase(agent);
  const spaceId = db?.spaceId;
  const chats = useQuery(db, Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent)));
  const primary = useMemo(() => selectPrimaryChat(chats), [chats]);
  const bindings = useBindingCount(primary);
  const [skills, setSkills] = useState<ListedSkill[]>([]);
  const refreshGeneration = useRef(0);

  const refresh = useCallback(async () => {
    if (!spaceId) {
      return;
    }

    const generation = ++refreshGeneration.current;
    const { data } = await invokePromise(AgentOperation.ListSkills, { agent: Ref.make(agent) }, { spaceId });
    // Reads overlap when bindings change in quick succession; only the latest may land.
    if (generation !== refreshGeneration.current) {
      return;
    }
    // Space-authored skills have no registry key and are edited where they live, not here.
    setSkills(
      (data?.skills ?? []).flatMap(({ key, name, customized, skill }) =>
        key ? [{ key, name, customized, skill }] : [],
      ),
    );
  }, [invokePromise, agent, spaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh, primary?.id, bindings]);

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

  return { skills, open, refresh };
};
