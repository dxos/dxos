//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/**
 * Response shapes for the Discord REST endpoints this client covers.
 *
 * Only the fields DXOS reads are declared, and everything Discord does not guarantee on every
 * message/channel variant is optional: the payloads differ by `type` and a decode failure on a
 * field nobody reads would take down an otherwise-working sync.
 *
 * Channels are one flat shape rather than a union discriminated on `type`, because call sites
 * identify a channel by `name` before they know which variant they hold.
 */

/** A Discord user, as embedded in a message author / mention list or returned by `/users/@me`. */
export const UserResponse = Schema.Struct({
  id: Schema.String,
  username: Schema.String,
  /** The user's chosen display name; falls back to `username` when unset. */
  global_name: Schema.NullOr(Schema.String).pipe(Schema.optional),
  discriminator: Schema.String.pipe(Schema.optional),
  avatar: Schema.NullOr(Schema.String).pipe(Schema.optional),
  bot: Schema.Boolean.pipe(Schema.optional),
});
export type UserResponse = Schema.Schema.Type<typeof UserResponse>;

/** A guild the authenticated bot or user belongs to (`/users/@me/guilds`). */
export const MyGuildResponse = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  icon: Schema.NullOr(Schema.String).pipe(Schema.optional),
  owner: Schema.Boolean.pipe(Schema.optional),
  permissions: Schema.String.pipe(Schema.optional),
});
export type MyGuildResponse = Schema.Schema.Type<typeof MyGuildResponse>;

/** A thread sub-channel, either spawned by a message or listed as active on a guild. */
export const ThreadResponse = Schema.Struct({
  id: Schema.String,
  type: Schema.Number,
  name: Schema.String,
  guild_id: Schema.String.pipe(Schema.optional),
  parent_id: Schema.NullOr(Schema.String).pipe(Schema.optional),
  owner_id: Schema.String.pipe(Schema.optional),
  message_count: Schema.Number.pipe(Schema.optional),
});
export type ThreadResponse = Schema.Schema.Type<typeof ThreadResponse>;

/** Points at the message a reply refers to when the referenced message itself was not inlined. */
export const MessageReferenceResponse = Schema.Struct({
  message_id: Schema.String.pipe(Schema.optional),
  channel_id: Schema.String.pipe(Schema.optional),
  guild_id: Schema.String.pipe(Schema.optional),
});
export type MessageReferenceResponse = Schema.Schema.Type<typeof MessageReferenceResponse>;

export const MessageResponse = Schema.Struct({
  id: Schema.String,
  channel_id: Schema.String,
  /** Discord message type; 0 = DEFAULT, 19 = REPLY. Absent on older payloads, which are DEFAULT. */
  type: Schema.Number.pipe(Schema.optional),
  content: Schema.String,
  /** ISO-8601. */
  timestamp: Schema.String,
  edited_timestamp: Schema.NullOr(Schema.String).pipe(Schema.optional),
  author: UserResponse,
  mentions: Schema.Array(UserResponse).pipe(Schema.optional),
  /**
   * The replied-to message. Modelled shallowly rather than recursively — only its `id` is read, and
   * a self-referential schema would buy nothing but a `Schema.suspend`.
   */
  referenced_message: Schema.NullOr(Schema.Struct({ id: Schema.String })).pipe(Schema.optional),
  message_reference: MessageReferenceResponse.pipe(Schema.optional),
  /** Set when this message started a thread. */
  thread: ThreadResponse.pipe(Schema.optional),
});
export type MessageResponse = Schema.Schema.Type<typeof MessageResponse>;

/** A channel inside a guild (`type` 0 = GUILD_TEXT, 5 = GUILD_ANNOUNCEMENT). */
export const GuildChannelResponse = Schema.Struct({
  id: Schema.String,
  type: Schema.Number,
  guild_id: Schema.String.pipe(Schema.optional),
  name: Schema.NullOr(Schema.String).pipe(Schema.optional),
  topic: Schema.NullOr(Schema.String).pipe(Schema.optional),
  parent_id: Schema.NullOr(Schema.String).pipe(Schema.optional),
  nsfw: Schema.Boolean.pipe(Schema.optional),
  position: Schema.Number.pipe(Schema.optional),
});
export type GuildChannelResponse = Schema.Schema.Type<typeof GuildChannelResponse>;

/** A DM channel. Structurally a guild channel without a guild; aliased for call-site clarity. */
export type PrivateChannelResponse = GuildChannelResponse;

/** A group DM channel. */
export type PrivateGroupChannelResponse = GuildChannelResponse;

/** Any channel returned by the channel-listing endpoints. */
export type ChannelResponse = GuildChannelResponse;

/** `GET /guilds/{id}/threads/active`. `members` is dropped; nothing reads it. */
export const ActiveThreadsResponse = Schema.Struct({
  threads: Schema.Array(ThreadResponse),
});
export type ActiveThreadsResponse = Schema.Schema.Type<typeof ActiveThreadsResponse>;

/**
 * Discord's error envelope: a numeric API code plus a human-readable message, and on a 429 the
 * backoff in fractional seconds. One shape covers both because the envelope is decoded before the
 * status is known to be 429.
 */
export const ErrorResponseBody = Schema.Struct({
  code: Schema.Number.pipe(Schema.optional),
  message: Schema.String.pipe(Schema.optional),
  retry_after: Schema.Number.pipe(Schema.optional),
  global: Schema.Boolean.pipe(Schema.optional),
});
export type ErrorResponseBody = Schema.Schema.Type<typeof ErrorResponseBody>;

export type ListMessagesOptions = {
  /** Snowflake id; only messages strictly newer than this are returned. */
  readonly after?: string;
  readonly before?: string;
  /** 1-100. */
  readonly limit?: number;
};

export type ListMyGuildsOptions = {
  readonly after?: string;
  readonly before?: string;
  /** 1-200. */
  readonly limit?: number;
};
