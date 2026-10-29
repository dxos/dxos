//
// Copyright 2026 DXOS.org
//

// Type-only imports keep `dfx` and the crawler out of the bundle of a worker that serves the crawler's `Source`.
import type { MessageResponse, UserResponse } from 'dfx/types';

import type { ThreadRef, Type } from '@dxos/crawler';

/**
 * Discord snowflake epoch - 2015-01-01 00:00:00 UTC in milliseconds. All
 * Discord snowflakes (message ids, channel ids, ...) encode the time of
 * creation as `(unix_ms - DISCORD_EPOCH_MS) << 22`. We use this to construct
 * an "after" snowflake from a wall-clock cutoff so we can ask Discord for
 * "messages since N days ago" without first knowing any message id.
 */
export const DISCORD_EPOCH_MS = 1_420_070_400_000;

/**
 * Construct a Discord snowflake that sorts equal to the given wall-clock
 * timestamp. Used as the `after` parameter on `/channels/{id}/messages` to
 * start the initial sync at a bounded lookback rather than walking the full
 * channel history (which would generate hundreds of requests and burn through
 * the bot's rate limit on busy channels).
 *
 * BigInt because the result exceeds `Number.MAX_SAFE_INTEGER` for any
 * timestamp in the post-2015 epoch.
 */
export const snowflakeForTimestamp = (timestampMs: number): string => {
  const adjusted = Math.max(0, timestampMs - DISCORD_EPOCH_MS);
  return (BigInt(Math.floor(adjusted)) << 22n).toString();
};

/** Discord message types we ingest: DEFAULT (0) and REPLY (19); everything else is a system event. */
const isContentMessage = (raw: MessageResponse): boolean => {
  const type = raw.type ?? 0;
  return type === 0 || type === 19;
};

/**
 * Resolve Discord mention markup so raw snowflake ids never reach extraction: user mentions become
 * `@displayName`, custom emoji collapse to `:name:`, and channel/role mentions (whose names aren't
 * carried on the message) are dropped. Without this the extractor treats e.g. `<#837...>` as an entity.
 */
export const normalizeMentions = (content: string, mentions: ReadonlyArray<UserResponse>): string => {
  const names = new Map(mentions.map((user) => [user.id, user.global_name || user.username]));
  return content
    .replace(/<@!?(\d+)>/g, (_match, id) => `@${names.get(id) ?? 'user'}`)
    .replace(/<#\d+>/g, '')
    .replace(/<@&\d+>/g, '')
    .replace(/<a?:(\w+):\d+>/g, ':$1:')
    .replace(/ {2,}/g, ' ')
    .trim();
};

/**
 * Map a raw Discord message to a crawler message. Unlike the feed-sync path (which keeps only the
 * sender's display name), this preserves the author's stable `id` so the agent registry tokenizes by
 * user id, not name.
 */
export const mapDiscordMessage = (raw: MessageResponse): Type.Message | undefined => {
  if (!isContentMessage(raw)) {
    return undefined;
  }
  const parentId =
    (raw.type === 19
      ? (raw.referenced_message?.id ?? raw.message_reference?.message_id)
      : raw.referenced_message?.id) ?? undefined;
  const displayName =
    raw.author.global_name && raw.author.global_name.length > 0 ? raw.author.global_name : raw.author.username;
  return {
    id: raw.id,
    text: normalizeMentions(raw.content ?? '', raw.mentions ?? []),
    author: { id: raw.author.id, source: 'discord', username: raw.author.username, displayName },
    createdAt: raw.timestamp,
    ...(parentId ? { parentId } : {}),
  };
};

/** Thread sub-channels spawned by messages in a page. */
export const threadRefsOf = (raw: readonly MessageResponse[]): ThreadRef[] =>
  raw.flatMap((message) =>
    message.thread ? [{ threadId: message.thread.id, parentMessageId: message.id, name: message.thread.name }] : [],
  );
