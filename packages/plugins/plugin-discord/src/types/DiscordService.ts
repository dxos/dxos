//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

/**
 * What a crawl reads from Discord, and nothing else: a server's channels and a channel's messages, read as the bot
 * installed in the server. The bot host holds the bot's token and signs every Discord call itself, so neither a token
 * nor a raw API response reaches the caller.
 */

export class DiscordServiceError extends BaseError.extend('DiscordServiceError', 'Discord read failed.') {}

/** Which bot reads, for which space; the bot host refuses a space that does not own the bot. */
export type Bot = {
  readonly applicationId: string;
  readonly spaceId: string;
};

const User = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  global_name: Schema.optional(Schema.NullOr(Schema.String)),
});

/** A Discord message in Discord's own field names, trimmed to what a crawl maps. */
export const Message = Schema.Struct({
  id: Schema.String,
  type: Schema.optional(Schema.Number),
  content: Schema.optional(Schema.String),
  timestamp: Schema.String,
  author: User,
  mentions: Schema.optional(Schema.Array(User)),
  referenced_message: Schema.optional(Schema.NullOr(Schema.Struct({ id: Schema.String }))),
  message_reference: Schema.optional(Schema.Struct({ message_id: Schema.optional(Schema.String) })),
  thread: Schema.optional(Schema.Struct({ id: Schema.String, name: Schema.String })),
});

export interface Message extends Schema.Schema.Type<typeof Message> {}

/** A text or announcement channel of a server the space connected. */
export const Channel = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  guildId: Schema.String,
  guildName: Schema.String,
});

export interface Channel extends Schema.Schema.Type<typeof Channel> {}

export type FetchMessages = {
  readonly channelId: string;
  /** Messages after this id; `0` from the channel's start. */
  readonly after: string;
  readonly limit: number;
};

export interface Service {
  /** Text and announcement channels of the servers in which the space has connected a channel. */
  readonly listChannels: (bot: Bot) => Effect.Effect<readonly Channel[], DiscordServiceError>;
  /** At most `limit` messages of a channel or thread after `after`, oldest first; refused outside those servers. */
  readonly fetchMessages: (bot: Bot, request: FetchMessages) => Effect.Effect<readonly Message[], DiscordServiceError>;
}

export class DiscordService extends Context.Service<DiscordService, Service>()('@dxos/plugin-discord/DiscordService') {}
