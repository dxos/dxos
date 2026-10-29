//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import type * as Skill from '@dxos/compute/Skill';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { EID, type SpaceId } from '@dxos/keys';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';
import { type Channel, Message } from '@dxos/types';

import { AgentActivity as AgentActivityComponent } from '#components';
import { AgentChannels, AgentOperation } from '#types';

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

  const [name] = useObject(agent, 'name');
  const list = useAgentChannelList(agent);
  const [values] = useObject(list);
  const channels = values?.channels ?? [];
  const conversations = useAgentConversations(agent);

  // The list owns its channels, so a channel taken off it is deleted rather than left hidden.
  const handleRemoveChannel = useCallback(
    (uri: string) => {
      if (!list || !db) {
        return;
      }
      const channel = list.channels.find((ref) => ref.uri === uri)?.peek();
      Obj.update(list, (list) => {
        list.channels = list.channels.filter((ref) => ref.uri !== uri);
      });
      if (channel) {
        db.remove(channel);
      }
    },
    [list, db],
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

  const [error, setError] = useState<string>();

  // A thread is deleted on its backend too (a Discord thread, for everyone in it); a whole channel's conversation only
  // loses its history here, since the channel itself is not the agent's to delete.
  const handleDelete = useCallback(
    async (id: string) => {
      const chat = conversations.find((chat) => chat.id === id);
      if (!chat || !db) {
        return;
      }
      const conversation = AgentChannels.conversationOf(chat);
      const channel = channels.find((ref) => entityIdOf(ref.uri) === conversation?.channelId);
      if (conversation?.thread !== undefined && channel) {
        const { data, error } = await invokePromise(
          ThreadOperation.DeleteThread,
          { channel, thread: conversation.thread },
          { spaceId: db.spaceId },
        );
        if (error || !data?.deleted) {
          setError(error?.message ?? data?.reason);
          return;
        }
      }
      setError(undefined);
      db.remove(chat);
    },
    [conversations, channels, db, invokePromise],
  );

  const skills = useAgentSkills(agent);
  const connections = useChannelConnections(channels, db?.spaceId);

  const handleRefresh = useCallback(() => {
    void skills.refresh();
    void connections.refresh();
  }, [skills.refresh, connections.refresh]);

  return (
    <AgentActivityComponent.Root
      role={role}
      error={error}
      toolbar={
        <AgentActivityComponent.Toolbar
          attendableId={attendableId}
          running={connections.running}
          connectable={channels.length > 0}
          busy={connections.busy}
          onStart={connections.start}
          onStop={connections.stop}
          onRefresh={handleRefresh}
        />
      }
    >
      <AgentActivityComponent.Agent id={agent.id} name={name} />
      <AgentActivityComponent.Skills ids={skills.skills.map((skill) => skill.key)}>
        {skills.skills.map(({ key, name, customized }) => (
          <AgentActivityComponent.Skill key={key} id={key} name={name} onOpen={customized ? skills.open : undefined} />
        ))}
      </AgentActivityComponent.Skills>
      <AgentActivityComponent.Channels ids={channels.map((ref) => ref.uri)}>
        {channels.map((ref) => (
          <ChannelTile
            key={ref.uri}
            channel={ref}
            status={connections.statuses[ref.uri]}
            onRemove={handleRemoveChannel}
          />
        ))}
      </AgentActivityComponent.Channels>
      <AgentActivityComponent.Conversations ids={conversations.map((chat) => chat.id)}>
        {conversations.map((chat) => (
          <ConversationTile
            key={chat.id}
            chat={chat}
            onSelect={handleSelect}
            onDelete={(id) => void handleDelete(id)}
          />
        ))}
      </AgentActivityComponent.Conversations>
    </AgentActivityComponent.Root>
  );
};

type ChannelTileProps = {
  channel: Ref.Ref<Channel.Channel>;
  status?: ChannelStatus;
  onRemove: (uri: string) => void;
};

/** One channel row, named by the channel its ref resolves to, with its connection's state and its backend's summary. */
const ChannelTile = ({ channel: ref, status, onRemove }: ChannelTileProps) => {
  const channel = useResolveRef(ref);
  // The backend's summary names what the channel is (an email channel's address), which its name alone does not.
  const summary = [status?.status?.state, status?.status?.detail].filter(Boolean).join(' · ');
  const detail = status?.error ?? status?.status?.error ?? (summary || undefined);
  return (
    <AgentActivityComponent.Channel
      id={ref.uri}
      name={channel?.name}
      detail={detail}
      missing={status?.missing}
      onRemove={onRemove}
    />
  );
};

/** How often connection status is re-read; a backend changes state on EDGE without notifying Composer. */
const STATUS_POLL_MS = 5_000;

type ChannelStatus = { status?: ThreadOperation.ConnectionStatus; error?: string; missing?: boolean };

/** Each channel's connection status (polled while mounted), and connect/disconnect for all of them. */
const useChannelConnections = (channels: readonly Ref.Ref<Channel.Channel>[], spaceId: SpaceId | undefined) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const [statuses, setStatuses] = useState<Record<string, ChannelStatus>>({});
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (
      operation:
        | typeof ThreadOperation.ConnectChannel
        | typeof ThreadOperation.DisconnectChannel
        | typeof ThreadOperation.GetChannelStatus,
    ) => {
      if (!spaceId || channels.length === 0) {
        return;
      }

      const results = await Promise.all(
        channels.map(async (channel): Promise<readonly [string, ChannelStatus]> => {
          // A ref that does not resolve (still loading, or its channel deleted) has no connection to read.
          if (!(await channel.tryLoad())) {
            return [channel.uri, { missing: true }];
          }
          const { data, error } = await invokePromise(operation, { channel }, { spaceId });
          return [channel.uri, { status: data?.status, error: error?.message }];
        }),
      );
      // A failed read keeps the last status on screen beside the error.
      setStatuses((previous) =>
        Object.fromEntries(
          results.map(([uri, next]) => [
            uri,
            next.missing ? next : { status: next.status ?? previous[uri]?.status, error: next.error },
          ]),
        ),
      );
    },
    [invokePromise, channels, spaceId],
  );

  const refresh = useCallback(() => run(ThreadOperation.GetChannelStatus), [run]);
  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), STATUS_POLL_MS);
    return () => clearInterval(interval);
  }, [refresh]);

  const withBusy = useCallback(
    async (operation: typeof ThreadOperation.ConnectChannel | typeof ThreadOperation.DisconnectChannel) => {
      setBusy(true);
      await run(operation);
      setBusy(false);
    },
    [run],
  );

  const start = useCallback(() => void withBusy(ThreadOperation.ConnectChannel), [withBusy]);
  const stop = useCallback(() => void withBusy(ThreadOperation.DisconnectChannel), [withBusy]);
  const running = Object.values(statuses).some(({ status }) => status?.running);

  return { statuses, running, busy, start, stop, refresh };
};

AgentActivity.displayName = 'AgentActivity';

/** The object id a ref URI names, whatever its space qualification. */
const entityIdOf = (uri: string): string | undefined => {
  const eid = EID.tryParse(uri);
  return eid ? EID.getEntityId(eid) : undefined;
};

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
 * feed and are read through an operation, so the list is re-read whenever the feed gains a binding entry -
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
