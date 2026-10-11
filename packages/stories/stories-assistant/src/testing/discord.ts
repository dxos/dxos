//
// Copyright 2026 DXOS.org
//

import type * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Agent from '@dxos/assistant/Agent';
import * as Chat from '@dxos/assistant/Chat';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as AgentChannels from '@dxos/plugin-agent/AgentChannels';
import * as AgentOperation from '@dxos/plugin-agent/AgentOperation';
import * as DiscordChannel from '@dxos/plugin-discord/DiscordChannel';
import { Channel } from '@dxos/types';

import { AGENT_NAME } from './playground.ts';

//
// The Discord bot story: one agent (Kai) bound to one Discord-backed channel, whose bot runs on EDGE.
//

/** The Discord ids the story's channel config is seeded with; empty values keep what the space already holds. */
export type DiscordBotArgs = {
  /** The Discord application (bot) id; EDGE keys the bot's gateway host by it. */
  applicationId?: string;
  /** The Discord channel the bot listens in. */
  channelId?: string;
  /** The Discord server (guild) the channel is in. */
  guildId?: string;
};

export const DISCORD_CHANNEL_NAME = 'Discord';

/** Placeholder secret: local EDGE substitutes `DISCORD_BOT_TOKEN_DEV`, so the space never holds the real token. */
const PLACEHOLDER_TOKEN = 'dev';

export type SetupDiscordAgentProps = DiscordBotArgs & {
  db: Database.Database;
  invoker: Capabilities.OperationInvoker;
  /** Runs the agent's chats on EDGE, where the bot's turns run; off for a story with no EDGE. */
  remote?: boolean;
};

/**
 * Creates the agent, a Discord-backed channel and the agent's channel list, reusing whatever a previous
 * run left in a persistent space, so a reload keeps the bot settings typed into the form.
 */
export const setupDiscordAgent = async ({
  db,
  invoker,
  applicationId,
  channelId,
  guildId,
  remote = false,
}: SetupDiscordAgentProps): Promise<{ agent: Agent.Agent; channel: Channel.Channel }> => {
  const agent = await ensureAgent(db, invoker, remote);
  const channel = await ensureChannel(db);

  const config = await channel.backend.config.load();
  if (DiscordChannel.instanceOf(config)) {
    Obj.update(config, (config) => {
      if (applicationId) {
        config.applicationId = applicationId;
      }
      if (guildId) {
        config.guildId = guildId;
      }
      if (channelId) {
        config.channels = [channelId];
      }
    });
  }

  const list = (await db.query(Filter.type(AgentChannels.AgentChannels)).run()).find(
    (list) => Obj.getParent(list)?.id === agent.id,
  );
  if (!list) {
    db.add(AgentChannels.make({ agent, channels: [channel] }));
  } else if (!(await Promise.all(list.channels.map((ref) => ref.load()))).some(({ id }) => id === channel.id)) {
    Obj.update(list, (list) => {
      list.channels = [...list.channels, Ref.make(channel)];
    });
  }

  await db.flush({ indexes: true });
  return { agent, channel };
};

const ensureAgent = async (db: Database.Database, invoker: Capabilities.OperationInvoker, remote: boolean) => {
  const agent =
    (await db.query(Filter.type(Agent.Agent)).run()).find(({ name }) => name === AGENT_NAME) ??
    (await createAgent(db, invoker));

  // Applied to a reused agent too: its chat may have been created for the other mode. An agent's chat runs on EDGE unless told otherwise.
  const [chat] = await db.query(Filter.and(Filter.type(Chat.Chat), Filter.childOf(agent))).run();
  if (chat && Obj.instanceOf(Chat.Chat, chat) && chat.remote !== remote) {
    Obj.update(chat, (chat) => {
      chat.remote = remote;
    });
  }
  return agent;
};

const createAgent = async (db: Database.Database, invoker: Capabilities.OperationInvoker) => {
  const { data, error } = await invoker.invokePromise(
    AgentOperation.CreateAgent,
    { name: AGENT_NAME },
    { spaceId: db.spaceId },
  );
  if (error || !data) {
    throw error ?? new Error('CreateAgent returned nothing.');
  }
  return data.agent.load();
};

const ensureChannel = async (db: Database.Database) => {
  const existing = (await db.query(Filter.type(Channel.Channel)).run()).find(
    (channel) => channel.backend.kind === DiscordChannel.BACKEND_KIND,
  );
  if (existing) {
    return existing;
  }

  const accessToken = db.add(
    AccessToken.make({ source: 'discord.com', account: AGENT_NAME, token: PLACEHOLDER_TOKEN }),
  );
  return db.add(
    Channel.make({
      name: DISCORD_CHANNEL_NAME,
      backend: {
        kind: DiscordChannel.BACKEND_KIND,
        config: DiscordChannel.make({ accessToken: Ref.make(accessToken), applicationId: '', channels: [] }),
      },
    }),
  );
};

//
// Fake EDGE bot host.
//

/** The `DiscordBotStatus` the fake answers with. */
export type FakeBotStatus = DiscordChannel.BotStatus;

/** The verbs the fake received, oldest first. */
export type FakeBotCall = { method: string; applicationId: string; body?: unknown };

export type FakeDiscordBot = {
  calls: FakeBotCall[];
  /** Replaces what later status reads return, e.g. to simulate a gateway failure. */
  setStatus: (status: Partial<FakeBotStatus>) => void;
  restore: () => void;
};

const BOT_PATH = /\/compute\/discord\/bots\/([^/?]+)/;

/** The gateway's states after a start, one per status read, so the monitor sees the transition. */
const STARTUP: DiscordChannel.GatewayState[] = ['connecting', 'ready'];

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ success: true, data }), { status, headers: { 'Content-Type': 'application/json' } });

/**
 * Stands in for EDGE's Discord bot routes (`/compute/discord/bots/<applicationId>`) by wrapping `fetch`:
 * PUT starts the bot (connecting, then ready on the next read), DELETE stops it, GET reports. EDGE's
 * `/auth` challenge answers 404 so the client proceeds unauthenticated instead of reaching a real EDGE.
 */
export const installFakeDiscordBot = (): FakeDiscordBot => {
  const original = globalThis.fetch;
  const calls: FakeBotCall[] = [];
  let status: FakeBotStatus = { running: false, gateway: 'idle', threads: 0 };
  let startup: DiscordChannel.GatewayState[] = [];

  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.pathname === '/auth') {
      return new Response(null, { status: 404 });
    }

    const match = url.pathname.match(BOT_PATH);
    if (!match) {
      return original(input, init);
    }

    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
    const applicationId = decodeURIComponent(match[1]);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, applicationId, body });

    switch (method) {
      case 'PUT': {
        startup = [...STARTUP];
        status = {
          running: true,
          gateway: startup.shift() ?? 'ready',
          threads: status.threads,
          botUserId: 'bot-user',
          config: {
            spaceId: body?.spaceId ?? '',
            applicationId,
            accessTokenId: 'access-token',
            channels: [],
            binding: body?.binding,
          },
        };
        break;
      }
      case 'DELETE': {
        startup = [];
        status = { running: false, gateway: 'closed', threads: status.threads };
        break;
      }
      default: {
        const next = startup.shift();
        if (next) {
          status = { ...status, gateway: next };
        }
      }
    }
    return json(status);
  };

  return {
    calls,
    setStatus: (update) => {
      status = { ...status, ...update };
    },
    restore: () => {
      globalThis.fetch = original;
    },
  };
};
