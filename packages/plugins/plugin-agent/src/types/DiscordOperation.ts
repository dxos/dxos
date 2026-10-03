//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref } from '@dxos/echo';
import { EdgeHttpClientService } from '@dxos/edge-client';

import * as DiscordBinding from './DiscordBinding.ts';

/** Gateway connection state reported by the EDGE bot host. */
export const GatewayState = Schema.Literals(['idle', 'connecting', 'ready', 'closed', 'failed']);
export type GatewayState = Schema.Schema.Type<typeof GatewayState>;

/** The bot configuration EDGE cached from the binding. */
export const BotConfig = Schema.Struct({
  spaceId: Schema.String,
  agent: Schema.String,
  applicationId: Schema.String,
  accessTokenId: Schema.String,
  channels: Schema.Array(Schema.String),
  binding: Schema.optional(Schema.String),
});

/** Mirrors the EDGE compute-service `DiscordBotStatus`. */
export const BotStatus = Schema.Struct({
  running: Schema.Boolean,
  gateway: GatewayState,
  config: Schema.optional(BotConfig),
  botUserId: Schema.optional(Schema.String),
  threads: Schema.Number.annotate({ description: 'Number of Discord threads the bot has mapped to chats.' }),
  lastError: Schema.optional(
    Schema.String.annotate({ description: 'Why the gateway last failed; EDGE retries on a watchdog.' }),
  ),
});
export type BotStatus = Schema.Schema.Type<typeof BotStatus>;

const BindingInput = Schema.Struct({
  binding: Ref.Ref(DiscordBinding.DiscordBinding).annotate({ description: 'The Discord binding of the agent.' }),
});

/** Starts (or reconfigures) the EDGE gateway for the binding's bot. */
export const StartBot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.startDiscordBot'),
    name: 'Start Discord bot',
    description: "Connects the agent's Discord bot to the EDGE gateway using its binding.",
    icon: 'ph--play--regular',
  },
  services: [Database.Service, EdgeHttpClientService],
  input: BindingInput,
  output: Schema.Struct({ status: BotStatus }),
});

/** Stops the EDGE gateway for the binding's bot; EDGE keeps its config and thread map. */
export const StopBot = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.stopDiscordBot'),
    name: 'Stop Discord bot',
    description: "Disconnects the agent's Discord bot from the EDGE gateway.",
    icon: 'ph--stop--regular',
  },
  services: [Database.Service, EdgeHttpClientService],
  input: BindingInput,
  output: Schema.Struct({}),
});

/** Reports the EDGE gateway status for the binding's bot. */
export const GetBotStatus = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.getDiscordBotStatus'),
    name: 'Get Discord bot status',
    description: "Reports whether the agent's Discord bot is connected to the EDGE gateway.",
    icon: 'ph--pulse--regular',
  },
  services: [Database.Service, EdgeHttpClientService],
  input: BindingInput,
  output: Schema.Struct({ status: BotStatus }),
});

/**
 * Posts a message as the binding's bot, to a user by DM or to a channel/thread, and records it as an
 * assistant message in the agent's chat for that channel. Calls Discord's REST API directly, so it
 * runs wherever the operation is hosted (EDGE or the app) without the gateway.
 */
export const SendMessage = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.agent.sendDiscordMessage'),
    name: 'Send Discord message',
    description:
      'Sends a Discord message as the agent: to a user by DM (userId) or to a channel or thread (channelId). Pass exactly one.',
    icon: 'ph--paper-plane-tilt--regular',
  },
  services: [Database.Service],
  input: Schema.Struct({
    binding: Ref.Ref(DiscordBinding.DiscordBinding).annotate({ description: 'The Discord binding of the agent.' }),
    userId: Schema.optional(Schema.String.annotate({ description: 'Discord user id to DM.' })),
    channelId: Schema.optional(Schema.String.annotate({ description: 'Discord channel or thread id to post in.' })),
    text: Schema.String.annotate({ description: 'The message; split into several posts past 2000 characters.' }),
  }),
  output: Schema.Struct({
    delivered: Schema.Boolean,
    channelId: Schema.optional(
      Schema.String.annotate({ description: 'The channel posted in (the DM channel for a user).' }),
    ),
    messageIds: Schema.optional(Schema.Array(Schema.String)),
    reason: Schema.optional(Schema.String.annotate({ description: 'Why the message was not delivered.' })),
  }),
});
