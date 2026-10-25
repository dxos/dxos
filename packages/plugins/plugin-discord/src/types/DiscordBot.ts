//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { BaseError } from '@dxos/errors';

/**
 * What an agent does through its Discord bot: post, react, open a DM, find a member. The bot runs on EDGE's
 * bot host, which holds the token; {@link DiscordBotService} reaches it, over HTTP from the app and over a worker
 * binding on EDGE.
 */

export class DiscordBotError extends BaseError.extend('DiscordBotError', 'Discord bot request failed.') {}

/** Which bot acts, for which agent; the bot host refuses a space that does not own the bot. */
export type Bot = {
  readonly applicationId: string;
  readonly spaceId: string;
  /** EID of the agent's Discord `Channel`, naming the binding (and so the agent) a DM it opens is routed to. */
  readonly channel: string;
};

/** Discord's upload cap for a bot in a server without boosts, per file. */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Discord's limit on files in one message. */
export const MAX_ATTACHMENTS = 10;

/**
 * A file to attach, by its key in the host's content-addressed blob store (the hex SHA-256 an `ni:` blob URI names), so
 * the bot fetches the bytes itself rather than receiving them over the call.
 */
export const Attachment = Schema.Struct({
  key: Schema.String,
  name: Schema.String,
  type: Schema.optional(Schema.String),
  size: Schema.optional(Schema.Number),
});

export interface Attachment extends Schema.Schema.Type<typeof Attachment> {}

/** Posts in a channel or thread, optionally as a reply to one of its messages. */
export const PostAction = Schema.Struct({
  kind: Schema.Literal('post'),
  channelId: Schema.String,
  text: Schema.String,
  replyTo: Schema.optional(Schema.String),
  files: Schema.optional(Schema.Array(Attachment)),
});

/** Adds the bot's reaction to a message. */
export const ReactAction = Schema.Struct({
  kind: Schema.Literal('react'),
  channelId: Schema.String,
  messageId: Schema.String,
  /** A unicode emoji, or `name:id` for a custom one. */
  emoji: Schema.String,
});

/** Opens (or reuses) the DM with a user and posts in it. */
export const DirectAction = Schema.Struct({
  kind: Schema.Literal('dm'),
  userId: Schema.String,
  text: Schema.String,
  files: Schema.optional(Schema.Array(Attachment)),
});

export const Action = Schema.Union([PostAction, ReactAction, DirectAction]);
export type Action = Schema.Schema.Type<typeof Action>;

/** Where the action landed; a reaction posts nothing, so it carries the channel only. */
export const ActionResult = Schema.Struct({
  channelId: Schema.String,
  /** The first message posted; a long text is split across several. */
  messageId: Schema.optional(Schema.String),
});

export interface ActionResult extends Schema.Schema.Type<typeof ActionResult> {}

/** A member of a guild the bot is in, as a handle search finds them. */
export const Member = Schema.Struct({
  userId: Schema.String,
  username: Schema.String,
  displayName: Schema.optional(Schema.String),
});

export interface Member extends Schema.Schema.Type<typeof Member> {}

export interface Service {
  readonly act: (bot: Bot, action: Action) => Effect.Effect<ActionResult, DiscordBotError>;
  /** Members of the bot's guilds whose username or nickname starts with `query`. */
  readonly findMembers: (bot: Bot, query: string) => Effect.Effect<readonly Member[], DiscordBotError>;
}

export class DiscordBotService extends Context.Service<DiscordBotService, Service>()(
  '@dxos/plugin-discord/DiscordBotService',
) {}
