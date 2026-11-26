//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as Skill from '@dxos/compute/Skill';
import { Annotation, Database, DXN, Obj, Ref, Type } from '@dxos/echo';
import { AccessToken } from '@dxos/link';
import * as ThreadOperation from '@dxos/plugin-thread/ThreadOperation';

import * as DiscordBot from './DiscordBot.ts';

/** Key of the skill an agent acts in Discord with; a plain key, so the config type need not import the skill. */
export const SKILL_KEY = 'org.dxos.skill.discord';

/** `Channel.backend.kind` of a channel that talks through a Discord bot. */
export const BACKEND_KIND = 'org.dxos.channel.backend.discord';

/**
 * The backend's own send and open-direct operations (`ThreadOperation.backendOperations`), which plugin-thread invokes
 * where it cannot see the backend's capability (plugin-discord's own bundle on EDGE); they act through the bot EDGE
 * serves as `DiscordBotService`.
 */
export const BackendOperation: ThreadOperation.BackendOperations<DiscordBot.DiscordBotService> = {
  Send: Operation.make({
    meta: {
      key: DXN.make('org.dxos.operation.discord.sendToChannel'),
      name: 'Send through Discord',
      description: 'Posts to a Discord channel, thread or DM through the bot.',
    },
    services: [Database.Service, Capability.Service, DiscordBot.DiscordBotService],
    input: ThreadOperation.SendToChannel.input,
    output: ThreadOperation.SendToChannel.output,
  }),
  OpenDirect: Operation.make({
    meta: {
      key: DXN.make('org.dxos.operation.discord.openDirect'),
      name: 'Open a Discord DM',
      description: 'Names the DM the bot opens with a person on the first message, from their Discord user id.',
    },
    services: [Database.Service, Capability.Service, DiscordBot.DiscordBotService],
    input: ThreadOperation.OpenDirect.input,
    output: ThreadOperation.OpenDirect.output,
  }),
};

/**
 * Prefix of the thread id of a DM the agent asked for but EDGE's bot has not opened yet (`dm:<Discord user id>`):
 * the bot opens it on the first message sent to it, and the send's receipt names the DM channel.
 */
export const PENDING_DM_PREFIX = 'dm:';

/** The thread id of a DM with a Discord user that the bot opens on the first message sent to it. */
export const pendingDmThread = (userId: string): string => `${PENDING_DM_PREFIX}${userId}`;

/** The Discord user a pending-DM thread id names, or `undefined` for any other thread. */
export const pendingDmUser = (thread: string): string | undefined =>
  thread.startsWith(PENDING_DM_PREFIX) ? thread.slice(PENDING_DM_PREFIX.length) : undefined;

/** The bot and the Discord channels it serves; the create-channel form edits these. */
export const Properties = Schema.Struct({
  // Absent for Kai, whose token EDGE holds; only a team's own bot records one.
  accessToken: Schema.optional(
    Ref.Ref(AccessToken.AccessToken).annotate({
      title: 'Bot token',
      description: 'Your own Discord bot token; leave empty for Kai.',
    }),
  ),
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
    // Bound to every conversation of the channel's agent: its written text is not posted, so these are how it speaks.
    Skill.SkillsAnnotation.set([SKILL_KEY]),
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
  accessTokenId: Schema.optional(Schema.String),
  channels: Schema.Array(Schema.String),
  binding: Schema.optional(Schema.String),
});

/** Mirrors the EDGE discord-service `DiscordBotStatus`, which every bot route answers with. */
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

// The Kai app id is how a config left blank, or a panel outside plugin-discord, names the EDGE-hosted bot.
export { KAI_APPLICATION_IDS, kaiApplicationId } from '../constants.ts';
