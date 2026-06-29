//
// Copyright 2026 DXOS.org
//

/**
 * A source-native user (the author of a message). Identified by a stable id (e.g. a Discord
 * user id), never by display name — names collide and change.
 */
export type User = {
  /** Stable source-native id (e.g. Discord user id / snowflake). */
  readonly id: string;
  /** Source namespace, e.g. 'discord'. */
  readonly source: string;
  /** Login/handle (an alias, not the key). */
  readonly username?: string;
  /** Display name (a label, not the key). */
  readonly displayName?: string;
};

/** A source-native message, normalized to the fields the pipeline needs. */
export type Message = {
  /** Stable source-native id (e.g. Discord message snowflake). Used as the crawl cursor. */
  readonly id: string;
  readonly text: string;
  readonly author: User;
  /** ISO-8601 creation time. */
  readonly createdAt?: string;
  /** Id of the message this one replies to, when known. */
  readonly parentId?: string;
};

/** Lifecycle of a crawl target. */
export type TargetStatus = 'pending' | 'active' | 'done' | 'error';

/**
 * A unit of crawlable work — a channel or a thread sub-channel. The frontier is a persisted stack
 * of these; per-target {@link cursor} is the resumable sync point.
 */
export type Target = {
  /** Stable target id: the channel id, or the thread's own channel id. */
  readonly id: string;
  /** Source channel id to fetch from (for a thread this is the thread's own channel id). */
  readonly channelId: string;
  /** Set when this target is a thread sub-channel. */
  readonly threadId?: string;
  /** The message in the parent channel that spawned this thread. */
  readonly parentMessageId?: string;
  /** Last message id processed; the resume point. */
  readonly cursor?: string;
  /** Depth-first descent depth (0 = top-level channel). */
  readonly depth: number;
  readonly status: TargetStatus;
  readonly lastError?: string;
};

/** Typed event stream the crawl loop emits; stages subscribe by `_tag`. */
export type Event =
  | { readonly _tag: 'ChannelStart'; readonly target: Target }
  | { readonly _tag: 'Message'; readonly target: Target; readonly message: Message }
  | { readonly _tag: 'ThreadStart'; readonly target: Target; readonly parentMessageId: string }
  | { readonly _tag: 'ThreadEnd'; readonly target: Target }
  | { readonly _tag: 'ChannelEnd'; readonly target: Target };

export type EventTag = Event['_tag'];

/** Crawl configuration: what to crawl and how. */
export type Config = {
  /** Top-level channel ids to crawl. */
  readonly channels: readonly string[];
  /** Descend depth-first into thread sub-channels discovered while crawling. */
  readonly descendThreads: boolean;
  /** Thread recursion bound (default: unbounded). */
  readonly maxDepth?: number;
  /** Initial lookback when a target has no cursor yet. */
  readonly seed?: { readonly maxDays?: number };
};
