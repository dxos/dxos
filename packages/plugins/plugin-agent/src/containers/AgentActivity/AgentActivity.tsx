//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/ui';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import type * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import type * as Skill from '@dxos/compute/Skill';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { useObject, useQuery, useResolveRef } from '@dxos/echo-react';
import { type SpaceId } from '@dxos/keys';
import { useInterval } from '@dxos/react-hooks';
import { Message } from '@dxos/types';

import { AgentActivity as AgentActivityComponent } from '#components';
import { AgentOperation, DiscordBinding, DiscordOperation } from '#types';

/** How often the bot status is re-read; the gateway changes state on EDGE without notifying Composer. */
const STATUS_POLL_MS = 5_000;

export type AgentActivityProps = {
  role?: string;
  attendableId?: string;
  agent: Agent.Agent;
};

/** The Agent's main article: its Discord binding and bot, and the conversations bridged from Discord threads. */
export const AgentActivity = ({ role, attendableId, agent }: AgentActivityProps) => {
  const { invokePromise } = useOperationInvoker();
  const db = Obj.getDatabase(agent);

  // Child-of filters rather than `.children()` traversals, which EDGE's query planner cannot run.
  const bindingFilter = useMemo(
    () => Filter.and(Filter.type(DiscordBinding.DiscordBinding), Filter.childOf(agent)),
    [agent],
  );
  // `Filter.and` widens to the child-of filter's untyped result, so the element type is restated here.
  const binding: DiscordBinding.DiscordBinding | undefined = useQuery(db, bindingFilter).at(0);
  const [values] = useObject(binding);

  const chatFilter = useMemo(() => Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent)), [agent]);
  const chats: Chat.Chat[] = useQuery(db, chatFilter);
  // Thread chats carry their Discord key from creation, so membership alone decides the list; ULID ids sort by age.
  const threads = useMemo(
    () =>
      chats
        .filter((chat) => Obj.getMeta(chat).keys.some((key) => key.source === DiscordBinding.DISCORD_SOURCE))
        .sort((left, right) => right.id.localeCompare(left.id)),
    [chats],
  );

  const handleSave = useCallback(
    (properties: DiscordBinding.Properties) => {
      if (binding) {
        Obj.update(binding, (binding) => {
          binding.accessToken = properties.accessToken;
          binding.applicationId = properties.applicationId;
          binding.guildId = properties.guildId;
          binding.channels = [...properties.channels];
        });
      } else {
        db?.add(DiscordBinding.make({ ...properties, agent }));
      }
    },
    [db, binding, agent],
  );

  const handleSelect = useCallback(
    (id: string) => {
      const chat = threads.find((chat) => chat.id === id);
      if (chat) {
        void invokePromise(LayoutOperation.Open, { subject: [GraphPath.getObjectPathFromObject(chat)] });
      }
    },
    [threads, invokePromise],
  );

  const bot = useDiscordBot(binding, db?.spaceId);
  const skills = useAgentSkills(agent);

  return (
    <AgentActivityComponent.Root
      role={role}
      attendableId={attendableId}
      bound={binding !== undefined}
      running={bot.status?.running}
      busy={bot.busy}
      onStart={bot.start}
      onStop={bot.stop}
      onRefresh={bot.refresh}
    >
      <AgentActivityComponent.Discord
        db={db}
        values={values}
        bound={binding !== undefined}
        status={bot.status}
        error={bot.error}
        bindingId={binding?.id}
        onSave={handleSave}
      />
      <AgentActivityComponent.Skills>
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
      <AgentActivityComponent.Conversations>
        {threads.map((chat) => (
          <ConversationTile key={chat.id} chat={chat} onSelect={handleSelect} />
        ))}
      </AgentActivityComponent.Conversations>
    </AgentActivityComponent.Root>
  );
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

/** Start/stop/refresh for the binding's bot, polling its EDGE gateway status while a binding exists. */
const useDiscordBot = (binding: DiscordBinding.DiscordBinding | undefined, spaceId: SpaceId | undefined) => {
  const { invokePromise } = useOperationInvoker();
  const [status, setStatus] = useState<DiscordOperation.BotStatus>();
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!binding || !spaceId) {
      return;
    }

    const { data, error } = await invokePromise(
      DiscordOperation.GetBotStatus,
      { binding: Ref.make(binding) },
      { spaceId },
    );
    setError(error?.message);
    // A failed poll keeps the last status on screen beside the error.
    if (data) {
      setStatus(data.status);
    }
  }, [invokePromise, binding, spaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  useInterval(refresh, STATUS_POLL_MS, [refresh]);

  const start = useCallback(async () => {
    if (!binding || !spaceId) {
      return;
    }

    setBusy(true);
    const { data, error } = await invokePromise(DiscordOperation.StartBot, { binding: Ref.make(binding) }, { spaceId });
    setError(error?.message);
    setStatus(data?.status);
    setBusy(false);
  }, [invokePromise, binding, spaceId]);

  const stop = useCallback(async () => {
    if (!binding || !spaceId) {
      return;
    }

    setBusy(true);
    const { error } = await invokePromise(DiscordOperation.StopBot, { binding: Ref.make(binding) }, { spaceId });
    if (error) {
      setError(error.message);
    } else {
      await refresh();
    }
    setBusy(false);
  }, [invokePromise, binding, spaceId, refresh]);

  return { status, error, busy, start, stop, refresh };
};

type ListedSkill = { key: string; name: string; customized: boolean; skill?: Ref.Ref<Skill.Skill> };

/**
 * The plugin skills the agent's conversation binds, with customize/reset/open. Bindings live in the chat's
 * feed and are read through an operation, so the list is re-read after each change rather than subscribed.
 */
const useAgentSkills = (agent: Agent.Agent) => {
  const { invokePromise } = useOperationInvoker();
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
