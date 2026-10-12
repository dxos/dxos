//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Agent from '@dxos/assistant/Agent';
import * as Credential from '@dxos/compute/Credential';
import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';
import { AccessToken, Connection } from '@dxos/link';
import { Channel } from '@dxos/types';

//
// Administration of a Discord app (bot) for agents: the servers it is in, their channels, and which channel is
// bound to which agent. The bot side runs on EDGE's bot host; the user side reads the signed-in user's own guilds.
//

/** A Discord server (guild). */
export const Guild = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.optional(Schema.String),
});

export interface Guild extends Schema.Schema.Type<typeof Guild> {}

/** A text, announcement or forum channel in a guild. */
export const GuildChannel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  type: Schema.Number,
  parentId: Schema.optional(Schema.String),
  /** The name of the category the channel is filed under. */
  category: Schema.optional(Schema.String),
});

export interface GuildChannel extends Schema.Schema.Type<typeof GuildChannel> {}

/** A Discord channel routed to an agent's `Channel`, as EDGE's bot host records it. */
export const ChannelBinding = Schema.Struct({
  discordChannelId: Schema.String,
  guildId: Schema.optional(Schema.String),
  /** EID of the Composer `Channel` the conversations are kept under. */
  channel: Schema.String,
  /** The agent's ref URI. */
  agent: Schema.String,
});

export interface ChannelBinding extends Schema.Schema.Type<typeof ChannelBinding> {}

/** Which Discord app (bot) the operation acts on, and the space object holding its token. */
const Bot = {
  applicationId: Schema.String.annotate({ description: 'The Discord application (bot) id.' }),
  accessToken: Ref.Ref(AccessToken.AccessToken).annotate({ description: 'The bot token.' }),
};

/** The guilds the signed-in user may administer (Manage Server, or owner). */
export const ListManagedGuilds = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.listManagedGuilds'),
    name: 'List managed Discord servers',
    description: 'Lists the Discord servers the connected user can administer.',
    icon: 'ph--users-three--regular',
  },
  services: [Database.Service, Credential.CredentialsService],
  input: Schema.Struct({
    connection: Ref.Ref(Connection.Connection).annotate({ description: "The user's Discord connection." }),
  }),
  output: Schema.Struct({ guilds: Schema.Array(Guild) }),
});

/** The guilds the bot has been installed in. */
export const ListBotGuilds = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.listBotGuilds'),
    name: 'List bot servers',
    description: 'Lists the Discord servers the bot is installed in.',
    icon: 'ph--robot--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct(Bot),
  output: Schema.Struct({ guilds: Schema.Array(Guild) }),
});

/** The channels of a guild the bot can see. */
export const ListGuildChannels = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.listGuildChannels'),
    name: 'List server channels',
    description: 'Lists the text, announcement and forum channels of a Discord server the bot is in.',
    icon: 'ph--hash--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({ ...Bot, guildId: Schema.String }),
  output: Schema.Struct({ channels: Schema.Array(GuildChannel) }),
});

/** The bot's channel bindings in this space. */
export const ListBindings = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.listBindings'),
    name: 'List channel bindings',
    description: 'Lists which Discord channels the bot routes to which agents in this space.',
    icon: 'ph--link--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({ applicationId: Bot.applicationId }),
  output: Schema.Struct({ bindings: Schema.Array(ChannelBinding) }),
});

/**
 * Routes a Discord channel to an agent: adds it to the agent's Discord `Channel` for the guild (created, and added
 * to the agent's channels, on first use), then registers the binding with EDGE's bot host.
 */
export const BindChannel = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.bindChannel'),
    name: 'Bind Discord channel',
    description: 'Routes a Discord channel to an agent.',
    icon: 'ph--link--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({
    ...Bot,
    agent: Ref.Ref(Agent.Agent),
    guildId: Schema.String,
    discordChannelId: Schema.String,
    /** The Discord channel's name, which the agent's `Channel` takes. */
    channelName: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({ channel: Ref.Ref(Channel.Channel) }),
});

/** Stops routing a Discord channel to its agent. */
export const UnbindChannel = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.discord.removeChannelBinding'),
    name: 'Unbind Discord channel',
    description: 'Stops routing a Discord channel to its agent.',
    icon: 'ph--link-break--regular',
  },
  services: [Database.Service, Capability.Service],
  input: Schema.Struct({ applicationId: Bot.applicationId, discordChannelId: Schema.String }),
  output: Schema.Struct({}),
});
