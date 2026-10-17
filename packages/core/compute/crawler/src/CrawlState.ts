//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Obj, Type } from '@dxos/echo';

import type * as CrawlType from './types.ts';

/** Lifecycle of a crawl target, as stored. */
export const TargetStatus = Schema.Literals(['pending', 'active', 'done', 'error']);

/** Lifecycle of the whole crawl, as stored. */
export const RunStatus = Schema.Literals(['idle', 'running', 'paused', 'done', 'error']);
export type RunStatus = Schema.Schema.Type<typeof RunStatus>;

/**
 * One frontier target. Kept in a map keyed by the target id rather than an array, so a client resetting one target
 * and an invocation advancing another merge instead of conflicting; `position` carries the stack order.
 */
export const TargetRecord = Schema.Struct({
  channelId: Schema.String,
  threadId: Schema.optional(Schema.String),
  parentMessageId: Schema.optional(Schema.String),
  depth: Schema.Number,
  /** Push order: the frontier is a stack, so the highest actionable position is read next. */
  position: Schema.Number,
  status: TargetStatus,
  cursor: Schema.optional(Schema.String),
  lastRunAt: Schema.optional(Schema.String),
  lastError: Schema.optional(Schema.String),
});
export type TargetRecord = Schema.Schema.Type<typeof TargetRecord>;

/** What the last invocation of the crawl did. */
export const LastRun = Schema.Struct({
  /** ISO-8601 of when it finished. */
  at: Schema.String,
  /** Crawl steps (a page each) it ran. */
  steps: Schema.Number,
  /** Messages it committed. */
  messages: Schema.Number,
  /** Whether no target was left to read after it. */
  done: Schema.Boolean,
  /** Targets skipped because a fetch failed. */
  errored: Schema.Number,
  /** Why it failed, when it did. */
  error: Schema.optional(Schema.String),
});
export type LastRun = Schema.Schema.Type<typeof LastRun>;

/**
 * The durable state of one crawl, in ECHO: the frontier with each target's cursor, the run status, and the content
 * hash of every message already extracted (the fact cursor), so a re-read unchanged message costs no model call. It
 * is what lets a crawl run as a bounded operation invoked by a trigger: each invocation resumes from here.
 */
export class CrawlState extends Type.makeObject<CrawlState>(DXN.make('org.dxos.type.crawler.state', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    runStatus: RunStatus,
    targets: Schema.Record(Schema.String, TargetRecord),
    /** Content hash of each source document extracted, keyed by its source (e.g. `discord:<message id>`). */
    sourceHashes: Schema.Record(Schema.String, Schema.String),
    /** Messages committed over every run, including ones read again after a reset. */
    messages: Schema.Number,
    lastRun: Schema.optional(LastRun),
  }),
) {}

/** A new, empty crawl state. */
export const make = (props: { name?: string } = {}): CrawlState =>
  Obj.make(CrawlState, {
    ...(props.name !== undefined ? { name: props.name } : {}),
    runStatus: 'idle',
    targets: {},
    sourceHashes: {},
    messages: 0,
  });

const toTarget = (id: string, record: TargetRecord): CrawlType.Target => ({
  id,
  channelId: record.channelId,
  ...(record.threadId !== undefined ? { threadId: record.threadId } : {}),
  ...(record.parentMessageId !== undefined ? { parentMessageId: record.parentMessageId } : {}),
  depth: record.depth,
  status: record.status,
  ...(record.cursor !== undefined ? { cursor: record.cursor } : {}),
  ...(record.lastRunAt !== undefined ? { lastRunAt: record.lastRunAt } : {}),
  ...(record.lastError !== undefined ? { lastError: record.lastError } : {}),
});

/** Every target, in frontier order (bottom of the stack first); takes a snapshot as well as the object. */
export const listTargets = (state: Pick<CrawlState, 'targets'>): CrawlType.Target[] =>
  Object.entries(state.targets)
    .sort(([, left], [, right]) => left.position - right.position)
    .map(([id, record]) => toTarget(id, record));

/**
 * The setters below mutate a draft rather than opening their own `Obj.update`, so a caller batches several writes
 * into one transaction: `Obj.update(state, (state) => { setCursor(state, ...); setStatus(state, ...); })`.
 */
export type Draft = Obj.Mutable<CrawlState>;

/** Pushes targets onto the frontier; ids already present are ignored. */
export const pushTargets = (state: Draft, targets: readonly CrawlType.Target[]): void => {
  let position = Math.max(0, ...Object.values(state.targets).map((record) => record.position));
  for (const target of targets) {
    if (state.targets[target.id] !== undefined) {
      continue;
    }
    position++;
    state.targets[target.id] = {
      channelId: target.channelId,
      ...(target.threadId !== undefined ? { threadId: target.threadId } : {}),
      ...(target.parentMessageId !== undefined ? { parentMessageId: target.parentMessageId } : {}),
      depth: target.depth,
      position,
      status: target.status,
      ...(target.cursor !== undefined ? { cursor: target.cursor } : {}),
      ...(target.lastError !== undefined ? { lastError: target.lastError } : {}),
    };
  }
};

/** Advances a target's cursor and stamps when; `lastError` is kept as a diagnostic, as the other stores keep it. */
export const setCursor = (state: Draft, targetId: string, cursor: string, at: string): void => {
  const record = state.targets[targetId];
  if (record === undefined) {
    return;
  }
  record.cursor = cursor;
  record.lastRunAt = at;
};

/** Sets a target's status, recording `error` as its `lastError` when given. */
export const setStatus = (state: Draft, targetId: string, status: CrawlType.TargetStatus, error?: string): void => {
  const record = state.targets[targetId];
  if (record === undefined) {
    return;
  }
  record.status = status;
  if (error !== undefined) {
    record.lastError = error;
  }
};

/**
 * Rewinds targets (every target when `targetIds` is omitted) to `pending` with no cursor, last run or error, so the
 * next run reads them from the seed window again. The source hashes are kept: that is what makes the re-read free.
 */
export const resetTargets = (state: Draft, targetIds?: readonly string[]): void => {
  for (const id of Object.keys(state.targets)) {
    if (targetIds !== undefined && !targetIds.includes(id)) {
      continue;
    }
    const { channelId, threadId, parentMessageId, depth, position } = state.targets[id];
    // Replaced whole rather than field by field, so the optional fields are dropped rather than set to undefined.
    state.targets[id] = {
      channelId,
      ...(threadId !== undefined ? { threadId } : {}),
      ...(parentMessageId !== undefined ? { parentMessageId } : {}),
      depth,
      position,
      status: 'pending',
    };
  }
};

/** Drops targets from the frontier, cursor and all; a later push adds them afresh. */
export const removeTargets = (state: Draft, targetIds: readonly string[]): void => {
  for (const id of targetIds) {
    if (state.targets[id] !== undefined) {
      delete state.targets[id];
    }
  }
};

export const setRunStatus = (state: Draft, status: RunStatus): void => {
  if (state.runStatus !== status) {
    state.runStatus = status;
  }
};

/** The content hash recorded for a source document, if it was extracted before. */
export const sourceHash = (state: CrawlState, source: string): string | undefined => state.sourceHashes[source];

/** Records the content hash of a source document once its facts are stored. */
export const setSourceHash = (state: Draft, source: string, hash: string): void => {
  if (state.sourceHashes[source] !== hash) {
    state.sourceHashes[source] = hash;
  }
};

/** Forgets every source hash, so every message is extracted again on its next read. */
export const clearSourceHashes = (state: Draft): void => {
  for (const source of Object.keys(state.sourceHashes)) {
    delete state.sourceHashes[source];
  }
};

/**
 * Applies a channel set: channels no longer listed leave the frontier, new ones join it, and those crawled before
 * are reopened so what was posted since is read; their cursors are kept, so nothing is read twice. Run before each
 * invocation, so every run checks its channels for new messages. Threads found under a dropped channel stay, since a
 * target does not record the channel it came from; a finished thread is not reopened, so replies posted to it later
 * are read only after a reset.
 */
export const reconcileChannels = (state: Draft, channels: readonly string[]): void => {
  const dropped = listTargets(state)
    .filter((target) => target.depth === 0 && !channels.includes(target.id))
    .map((target) => target.id);
  removeTargets(state, dropped);
  pushTargets(
    state,
    channels.map((channelId) => ({ id: channelId, channelId, depth: 0, status: 'pending' })),
  );
  for (const target of listTargets(state)) {
    // A failed channel is retried too: a fetch error (e.g. a missing permission) may have been fixed since.
    if (target.depth === 0 && (target.status === 'done' || target.status === 'error')) {
      setStatus(state, target.id, 'pending');
    }
  }
};

/** Records what one invocation did, adding its messages to the running total. */
export const recordRun = (state: Draft, run: LastRun): void => {
  state.lastRun = run;
  state.messages += run.messages;
};
