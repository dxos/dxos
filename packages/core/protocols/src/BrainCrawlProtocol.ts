//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

//
// Wire protocol of EDGE compute-service's `/compute/brain/:spaceId/:agentId/crawl` routes: the back-index of Discord
// channels into an agent's brain, run by `@dxos/crawler` in the brain Durable Object. Mirrors EDGE's
// `@dxos/edge-protocol` `BrainCrawl` module field for field, since dxos must not depend on EDGE.
//

/** Lifecycle of the whole crawl; `paused` stops the brain's alarm from stepping it. */
export const RunStatus = Schema.Literals(['idle', 'running', 'paused', 'done', 'error']);
export type RunStatus = Schema.Schema.Type<typeof RunStatus>;

/** What the brain crawls, as `PUT /crawl` last set it. */
export const CrawlConfig = Schema.Struct({
  /** The Discord application whose bot is bound to the channels; it reads them with its own token. */
  applicationId: Schema.String,
  /** Top-level Discord channel ids, each bound to the bot in the agent's space. */
  channels: Schema.Array(Schema.String),
  /** Whether threads spawned in the channels are crawled too. */
  descendThreads: Schema.Boolean,
  /** How deep threads are descended; unset is unbounded. */
  maxDepth: Schema.optional(Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))),
  /** Lookback in days for a channel crawled for the first time; unset reads its whole history. */
  maxDays: Schema.optional(Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0))),
  /** EID of the fact feed every extracted fact is appended to, the exportable record; unset indexes only. */
  factFeed: Schema.optional(Schema.String),
});
export type CrawlConfig = Schema.Schema.Type<typeof CrawlConfig>;

/** `PUT /crawl`: sets or replaces the config and starts or continues the crawl. */
export const PutCrawlRequest = Schema.Struct({
  ...CrawlConfig.fields,
  channels: Schema.Array(Schema.String).check(Schema.isMinLength(1)),
  /** Defaults to `true`. */
  descendThreads: Schema.optional(Schema.Boolean),
});
export type PutCrawlRequest = Schema.Schema.Type<typeof PutCrawlRequest>;

/** `POST /crawl/reset`: the targets to crawl again from the start; every target when omitted. */
export const ResetCrawlRequest = Schema.Struct({
  targets: Schema.optional(Schema.Array(Schema.String)),
});
export type ResetCrawlRequest = Schema.Schema.Type<typeof ResetCrawlRequest>;

/** Progress of one target. */
export const TargetStatus = Schema.Literals(['pending', 'active', 'done', 'error']);
export type TargetStatus = Schema.Schema.Type<typeof TargetStatus>;

/** A channel or thread of the crawl, with its resume point. */
export const CrawlTarget = Schema.Struct({
  id: Schema.String,
  channelId: Schema.String,
  threadId: Schema.optional(Schema.String),
  parentMessageId: Schema.optional(Schema.String),
  /** The last message read; the crawl resumes after it. */
  cursor: Schema.optional(Schema.String),
  lastRunAt: Schema.optional(Schema.String),
  /** 0 for a channel, 1 and deeper for threads. */
  depth: Schema.Number,
  status: TargetStatus,
  lastError: Schema.optional(Schema.String),
});
export type CrawlTarget = Schema.Schema.Type<typeof CrawlTarget>;

/** What every crawl route answers with. */
export const CrawlStatus = Schema.Struct({
  config: Schema.optional(CrawlConfig),
  runStatus: RunStatus,
  summary: Schema.Struct({
    /** No target is left to read. */
    done: Schema.Boolean,
    /** Targets skipped because a fetch failed. */
    errored: Schema.Number,
  }),
  targets: Schema.Array(CrawlTarget),
  /** Facts in the agent's brain, from every source. */
  facts: Schema.Number,
  /** Messages the crawl has read through, over every run. */
  messages: Schema.Number,
  lastStepAt: Schema.optional(Schema.String),
  /** Why the last step failed, until one succeeds. */
  lastError: Schema.optional(Schema.String),
});
export type CrawlStatus = Schema.Schema.Type<typeof CrawlStatus>;
