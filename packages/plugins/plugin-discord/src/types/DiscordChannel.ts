//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { AccessToken } from '@dxos/link';

/** `Channel.backend.kind` of a channel that talks through a Discord bot. */
export const BACKEND_KIND = 'org.dxos.channel.backend.discord';

/** The bot and the Discord channels it serves; the create-channel form edits these. */
export const Properties = Schema.Struct({
  accessToken: Ref.Ref(AccessToken.AccessToken).annotate({
    title: 'Bot token',
    description: 'The Discord bot token the gateway connects with.',
  }),
  applicationId: Schema.String.annotate({
    title: 'Application ID',
    description: 'The Discord application (bot) id.',
  }),
  guildId: Schema.optional(
    Schema.String.annotate({
      title: 'Server ID',
      description: 'The Discord server (guild) the bot listens in.',
    }),
  ),
  channels: Schema.Array(Schema.String).annotate({
    title: 'Channels',
    description: 'Discord channel ids the bot listens in; the first one receives posts with no thread.',
  }),
});

export type Properties = Schema.Schema.Type<typeof Properties>;

/**
 * Config of a Discord-backed `Channel` (`Channel.backend.config`): the bot that posts and the
 * Discord channels it listens in. EDGE's gateway reads it from the space when the bot starts.
 */
export class DiscordChannel extends Type.makeObject<DiscordChannel>(DXN.make('org.dxos.type.discord.channel', '0.1.0'))(
  Properties.pipe(
    Annotation.LabelAnnotation.set(['applicationId']),
    Annotation.IconAnnotation.set({ icon: 'ph--discord-logo--regular', hue: 'indigo' }),
  ),
) {}

export const instanceOf = (value: unknown): value is DiscordChannel => Obj.instanceOf(DiscordChannel, value);

export type MakeProps = Omit<Obj.MakeProps<typeof DiscordChannel>, 'channels'> & { channels?: readonly string[] };

/** Creates a Discord channel config; parent it by referencing it from `Channel.backend.config`. */
export const make = ({ channels, ...props }: MakeProps): DiscordChannel =>
  Obj.make(DiscordChannel, { ...props, channels: [...(channels ?? [])] });

/** Gateway connection state reported by the EDGE bot host. */
export const GatewayState = Schema.Literals(['idle', 'connecting', 'ready', 'closed', 'failed']);
export type GatewayState = Schema.Schema.Type<typeof GatewayState>;

/** The bot configuration EDGE cached when the bot was started. */
export const BotConfig = Schema.Struct({
  spaceId: Schema.String,
  agent: Schema.optional(Schema.String),
  applicationId: Schema.String,
  accessTokenId: Schema.String,
  channels: Schema.Array(Schema.String),
  binding: Schema.optional(Schema.String),
});

/** Mirrors the EDGE compute-service `DiscordBotStatus`, which every bot route answers with. */
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

/** `ConnectionStatus.state` when EDGE runs this bot from a different config object. */
export const OTHER_CONFIG_STATE = 'other-config';
