//
// Copyright 2026 DXOS.org
//

import * as Context from 'effect/Context';
import type * as Effect from 'effect/Effect';

import { type CrawlError } from './errors';
import type * as Type from './types';

/** A channel the source can enumerate. */
export type ChannelInfo = {
  readonly id: string;
  readonly name?: string;
  readonly guildId?: string;
};

/** A thread sub-channel discovered while reading a page of messages. */
export type ThreadRef = {
  /** The thread's own channel id. */
  readonly threadId: string;
  /** Id of the parent-channel message that spawned the thread. */
  readonly parentMessageId: string;
  readonly name?: string;
};

/** A page of messages plus any threads spawned within it. */
export type Page = {
  /** Messages newer than the requested cursor, oldest-first. */
  readonly messages: readonly Type.Message[];
  /** Newest message id in this page; the next cursor. Undefined when nothing new. */
  readonly cursor?: string;
  /** Threads discovered in this page (to descend into). */
  readonly threads: readonly ThreadRef[];
};

/** Request shape for fetching a page from a channel or thread. */
export type Fetch = {
  readonly channelId: string;
  readonly threadId?: string;
  /** Return only messages newer than this id; undefined to start from the seed window. */
  readonly cursor?: string;
  /** Initial lookback in days when cursor is absent. */
  readonly maxDays?: number;
};

export interface SourceApi {
  /** Enumerate the channels available to this source (e.g. all guild text channels). */
  readonly listChannels: () => Effect.Effect<ChannelInfo[], CrawlError>;
  /** Fetch the next page after `cursor`. The crawl loop calls this repeatedly until drained. */
  readonly fetchMessages: (request: Fetch) => Effect.Effect<Page, CrawlError>;
}

/** The transport seam: implemented by a Discord adapter (live) or a fixture (tests/demo). */
export class Source extends Context.Tag('@dxos/crawler/Source')<Source, SourceApi>() {}
