//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type ContentBlock } from '@dxos/types';

import type * as Trajectory from './Trajectory.ts';

/**
 * A left fold over events in feed order; every view of a trajectory is one of these, so state after `n + k` events
 * is `step` applied `k` times to the state after `n`, and a reader never has to start from the first event.
 */
export interface Reducer<S> {
  readonly initial: S;
  readonly step: (state: S, event: Trajectory.Event) => S;
}

/**
 * Reducer state after the event `head`; a cache that is always safe to drop, since replaying from the start
 * rebuilds it exactly.
 */
export type Checkpoint<S> = {
  readonly state: S;
  readonly head?: Trajectory.EventId;
  /** Events folded so far. */
  readonly count: number;
};

/**
 * Folds `events` (the tail after `from.head`, in feed order) onto a checkpoint, or onto the initial state.
 * Fold only events EDGE has confirmed (`Feed.getPosition` is finite): confirmed positions never change, while an
 * unconfirmed append can still land after events that sync later, so folding it would make the state depend on timing.
 */
export const run = <S>(
  reducer: Reducer<S>,
  events: Iterable<Trajectory.Event>,
  from?: Checkpoint<S>,
): Checkpoint<S> => {
  let state = from?.state ?? reducer.initial;
  let head = from?.head;
  let count = from?.count ?? 0;
  for (const event of events) {
    state = reducer.step(state, event);
    head = event.id;
    count++;
  }

  return { state, head, count };
};

//
// Session state: what the agent process needs to decide its next step.
//

export type Alarm = { readonly id: Trajectory.EventId; readonly wakeAt: number; readonly message?: string };

export type BackgroundTool = { readonly toolCallId: string; readonly pid?: string };

export type ThreadStatus = 'open' | 'merged' | Trajectory.ThreadStatus;

export type ThreadInfo = {
  readonly id: Trajectory.EventId;
  readonly mode: Trajectory.ThreadMode;
  readonly status: ThreadStatus;
};

type SkillRef = Trajectory.ContextBind['skills'][number];
type ObjectRef = Trajectory.ContextBind['objects'][number];

export type SessionState = {
  /** User messages no `promptConsume` or `promptCancel` has named yet, oldest first. */
  readonly queue: readonly Trajectory.EventId[];
  readonly alarms: readonly Alarm[];
  readonly skills: readonly SkillRef[];
  readonly objects: readonly ObjectRef[];
  readonly background: readonly BackgroundTool[];
  readonly threads: readonly ThreadInfo[];
  readonly model?: Trajectory.ModelChange['model'];
  /** `turnBegin`s of turns that have not ended; more than one when several writers run turns at once. */
  readonly turns: readonly Trajectory.EventId[];
  /**
   * `promptConsume`s and `promptCancel`s whose message was no longer queued, because another writer consumed or
   * cancelled it first; a harness claims a message by writing its consume and runs only once that consume is
   * confirmed and not listed here.
   */
  readonly rejected: readonly Trajectory.EventId[];
};

const bind = <T extends { uri: string }>(current: readonly T[], added: readonly T[]): readonly T[] =>
  added.reduce<readonly T[]>(
    (refs, ref) => (refs.some((existing) => existing.uri === ref.uri) ? refs : [...refs, ref]),
    current,
  );

const unbind = <T extends { uri: string }>(current: readonly T[], removed: readonly T[]): readonly T[] =>
  current.filter((ref) => !removed.some((other) => other.uri === ref.uri));

const setThreadStatus = (threads: readonly ThreadInfo[], id: Trajectory.EventId, status: ThreadStatus) =>
  threads.map((thread) => (thread.id === id ? { ...thread, status } : thread));

export const session: Reducer<SessionState> = {
  initial: { queue: [], alarms: [], skills: [], objects: [], background: [], threads: [], turns: [], rejected: [] },
  step: (state, event) => {
    const payload = event.payload;
    switch (payload._tag) {
      case 'message':
        return event.sender.role === 'user' ? { ...state, queue: [...state.queue, event.id] } : state;
      case 'promptConsume':
      case 'promptCancel':
        return state.queue.includes(payload.message)
          ? { ...state, queue: state.queue.filter((id) => id !== payload.message) }
          : { ...state, rejected: [...state.rejected, event.id] };
      case 'turnBegin':
        return { ...state, turns: [...state.turns, event.id], model: payload.model };
      case 'turnEnd':
        return { ...state, turns: state.turns.filter((id) => id !== payload.begin) };
      case 'modelChange':
        return { ...state, model: payload.model };
      case 'contextBind':
        return { ...state, skills: bind(state.skills, payload.skills), objects: bind(state.objects, payload.objects) };
      case 'contextUnbind':
        return {
          ...state,
          skills: unbind(state.skills, payload.skills),
          objects: unbind(state.objects, payload.objects),
        };
      case 'alarmSet':
        return {
          ...state,
          alarms: [...state.alarms, { id: event.id, wakeAt: payload.wakeAt, message: payload.message }],
        };
      case 'alarmCancel':
      case 'alarmFire':
        return { ...state, alarms: state.alarms.filter((alarm) => alarm.id !== payload.alarm) };
      case 'toolBackground':
        return { ...state, background: [...state.background, { toolCallId: payload.toolCallId, pid: payload.pid }] };
      case 'toolDeliver':
        return { ...state, background: state.background.filter((tool) => tool.toolCallId !== payload.toolCallId) };
      case 'threadOpen':
        return { ...state, threads: [...state.threads, { id: event.id, mode: payload.mode, status: 'open' }] };
      case 'threadMerge':
        return { ...state, threads: setThreadStatus(state.threads, payload.thread, 'merged') };
      case 'threadClose':
        return { ...state, threads: setThreadStatus(state.threads, payload.thread, payload.status) };
      default:
        return state;
    }
  },
};

//
// Thread view: what the UI renders.
//

export type ItemStatus = 'queued' | 'consumed' | 'cancelled' | 'sent';

export type ThreadItem = {
  readonly id: Trajectory.EventId;
  readonly sender: Trajectory.Sender;
  readonly blocks: readonly ContentBlock.Any[];
  readonly created: string;
  /** Thread the message was written in; absent for the main thread. */
  readonly thread?: Trajectory.EventId;
  readonly status: ItemStatus;
};

export type ThreadView = { readonly items: readonly ThreadItem[] };

const setItemStatus = (items: readonly ThreadItem[], id: Trajectory.EventId, status: ItemStatus) =>
  items.map((item) => (item.id === id ? { ...item, status } : item));

const consume = (items: readonly ThreadItem[], id: Trajectory.EventId, thread?: Trajectory.EventId) => {
  // A second consume of the same message lost the claim, so the message stays where the first one put it.
  const item = items.find((candidate) => candidate.id === id && candidate.status === 'queued');
  return item
    ? [...items.filter((candidate) => candidate.id !== id), { ...item, thread, status: 'consumed' as const }]
    : items;
};

/**
 * Every message, including turn threads still streaming; a user message moves to where it is consumed, the position
 * the model sees it at, and joins the consuming turn's thread. A consume or cancel whose message lies outside the loaded window is ignored, so the UI can
 * fold just the tail of a long conversation.
 */
export const thread: Reducer<ThreadView> = {
  initial: { items: [] },
  step: (state, event) => {
    const payload = event.payload;
    switch (payload._tag) {
      case 'message':
        return {
          items: [
            ...state.items,
            {
              id: event.id,
              sender: event.sender,
              blocks: payload.blocks,
              created: event.created,
              thread: event.thread,
              status: event.sender.role === 'user' ? 'queued' : 'sent',
            },
          ],
        };
      case 'promptConsume':
        return { items: consume(state.items, payload.message, event.thread) };
      case 'promptCancel':
        return state.items.some((item) => item.id === payload.message && item.status === 'queued')
          ? { items: setItemStatus(state.items, payload.message, 'cancelled') }
          : state;
      default:
        return state;
    }
  },
};

//
// Prompt: what the session process sends to the model.
//

export type PromptEntry = {
  readonly role: Trajectory.Role;
  readonly blocks: readonly ContentBlock.Any[];
  /** Events this entry was built from, so a later `compact` can find its range. */
  readonly source: readonly Trajectory.EventId[];
  /** Feed position of the event that placed the entry in its current buffer. */
  readonly at: number;
};

/**
 * Entries written in an open thread or turn, merged into `parent` (absent: main) when it ends.
 */
export type ThreadBuffer = {
  readonly parent?: Trajectory.EventId;
  /** A fresh thread's prompt is its own entries only; a fork's starts with its parent's. */
  readonly fresh: boolean;
  /**
   * Feed position of the last event the thread saw when it opened (its `from.event`); parent entries placed later
   * were written concurrently and are not in its prompt.
   */
  readonly seen: number;
  /** Merged or closed while a child was still open; kept, frozen, so the child's prompt does not change under it. */
  readonly closed?: boolean;
  readonly entries: readonly PromptEntry[];
};

export type PromptState = {
  /** The main thread's prompt; only appended to, except by `compact`. */
  readonly entries: readonly PromptEntry[];
  /** User messages waiting for a `promptConsume`. */
  readonly held: Readonly<Record<Trajectory.EventId, PromptEntry>>;
  readonly threads: Readonly<Record<Trajectory.EventId, ThreadBuffer>>;
  /** Events folded so far, which is the feed position of the next one. */
  readonly position: number;
  /** Feed position of every folded event, to resolve a `from.event`. */
  readonly positions: Readonly<Record<Trajectory.EventId, number>>;
  /**
   * Threads and turns that merged into a parent holding entries they never saw, with those entries' source events.
   * The merge still happens; whether to accept, re-run or correct is the harness's call.
   */
  readonly stale: Readonly<Record<Trajectory.EventId, readonly Trajectory.EventId[]>>;
};

const omit = <V>(record: Readonly<Record<string, V>>, key: string): Readonly<Record<string, V>> =>
  Object.fromEntries(Object.entries(record).filter(([other]) => other !== key));

const append = (
  state: PromptState,
  threadId: Trajectory.EventId | undefined,
  placed: Omit<PromptEntry, 'at'>,
): PromptState => {
  const entry: PromptEntry = { ...placed, at: state.position };
  if (threadId === undefined) {
    return { ...state, entries: [...state.entries, entry] };
  }

  const buffer = state.threads[threadId] ?? { fresh: false, seen: state.position, entries: [] };
  return { ...state, threads: { ...state.threads, [threadId]: { ...buffer, entries: [...buffer.entries, entry] } } };
};

/**
 * Closes a thread, appending `entries` to its parent; a parent that has already ended stands in for main.
 * A fresh thread never saw its parent, so only a fork or turn can be stale.
 */
const mergeInto = (state: PromptState, threadId: Trajectory.EventId, entries: readonly Omit<PromptEntry, 'at'>[]) => {
  const buffer = live(state, threadId);
  const parent = buffer?.parent;
  const target = parent !== undefined && live(state, parent) ? parent : undefined;
  const unseen =
    buffer && !buffer.fresh
      ? promptFor(state, target)
          .filter((entry) => entry.at > buffer.seen)
          .flatMap((entry) => entry.source)
      : [];
  return entries.reduce<PromptState>((next, entry) => append(next, target, entry), {
    ...state,
    threads: end(state.threads, threadId),
    stale: unseen.length > 0 ? { ...state.stale, [threadId]: unseen } : state.stale,
  });
};

/** A thread that is open and has not been merged or closed. */
const live = (state: PromptState, id: Trajectory.EventId) => {
  const buffer = state.threads[id];
  return buffer && !buffer.closed ? buffer : undefined;
};

/**
 * Removes an ended thread, or freezes it while a child still builds on it; a frozen parent goes once its last child
 * has ended.
 */
const end = (threads: PromptState['threads'], id: Trajectory.EventId): PromptState['threads'] => {
  const buffer = threads[id];
  if (!buffer) {
    return threads;
  }

  if (Object.values(threads).some((other) => other.parent === id)) {
    return { ...threads, [id]: { ...buffer, closed: true } };
  }

  const rest = omit(threads, id);
  const parent = buffer.parent === undefined ? undefined : rest[buffer.parent];
  return buffer.parent !== undefined && parent?.closed ? end(rest, buffer.parent) : rest;
};

/**
 * Feed position a thread with this origin saw up to; an origin this log does not hold (it cannot precede the
 * opener in a confirmed feed) falls back to everything before the opener.
 */
const seenAt = (state: PromptState, origin?: Trajectory.ThreadOrigin) =>
  origin && !origin.feed ? (state.positions[origin.event] ?? state.position) : state.position;

const open = (state: PromptState, id: Trajectory.EventId, buffer: ThreadBuffer): PromptState => ({
  ...state,
  threads: { ...state.threads, [id]: buffer },
});

/**
 * The prompt a turn in `thread` sends: its own entries after its parents', back to main, unless a fresh thread
 * cuts the chain.
 */
export const promptFor = (state: PromptState, thread?: Trajectory.EventId): readonly PromptEntry[] => {
  const buffer = thread === undefined ? undefined : state.threads[thread];
  if (!buffer) {
    return state.entries;
  }

  return buffer.fresh
    ? buffer.entries
    : [...promptFor(state, buffer.parent).filter((entry) => entry.at <= buffer.seen), ...buffer.entries];
};

const compact = (state: PromptState, payload: Trajectory.Compact, id: Trajectory.EventId) => {
  const entries = state.entries;
  const first = entries.findIndex((entry) => entry.source.includes(payload.from));
  const last = entries.findLastIndex((entry) => entry.source.includes(payload.to));
  // An id that is not in the prompt (a queued or cancelled message, a non-content event) cannot place the range.
  if (first === -1 || last === -1 || first > last) {
    return entries;
  }

  // The summary keeps the ids it replaced, so a later range that starts inside it still finds where to begin.
  const replaced = entries.slice(first, last + 1).flatMap((entry) => entry.source);
  // A thread that saw only part of the range sees the whole summary; compaction rewrites history either way.
  const at = Math.min(...entries.slice(first, last + 1).map((entry) => entry.at));
  const summary: PromptEntry = { role: 'event', blocks: payload.summary, source: [id, ...replaced], at };
  return [...entries.slice(0, first), summary, ...entries.slice(last + 1)];
};

/**
 * Builds the model prompt. Apart from `compact`, every event leaves `entries` as a prefix of what it was, which is
 * what keeps the provider's prompt cache valid from one request to the next.
 */
export const prompt: Reducer<PromptState> = {
  initial: { entries: [], held: {}, threads: {}, position: 0, positions: {}, stale: {} },
  step: (state, event) => {
    const next = place(state, event);
    return { ...next, position: state.position + 1, positions: { ...next.positions, [event.id]: state.position } };
  },
};

const place = (state: PromptState, event: Trajectory.Event): PromptState => {
  const payload = event.payload;
  switch (payload._tag) {
    case 'message': {
      const entry: PromptEntry = {
        role: event.sender.role,
        blocks: payload.blocks,
        source: [event.id],
        at: state.position,
      };
      return event.sender.role === 'user'
        ? { ...state, held: { ...state.held, [event.id]: entry } }
        : append(state, event.thread, entry);
    }
    case 'promptConsume': {
      const entry = state.held[payload.message];
      if (!entry) {
        return state;
      }

      return append({ ...state, held: omit(state.held, payload.message) }, event.thread, {
        ...entry,
        source: [...entry.source, event.id],
      });
    }
    case 'promptCancel':
      return { ...state, held: omit(state.held, payload.message) };
    case 'toolDeliver':
      return append(state, event.thread, { role: 'event', blocks: [payload.result], source: [event.id] });
    case 'hookEnd':
      return payload.blocks
        ? append(state, event.thread, { role: 'event', blocks: payload.blocks, source: [event.id] })
        : state;
    case 'threadOpen':
      // A fork of another conversation has no parent in this log, so its history starts empty.
      return open(state, event.id, {
        parent: payload.from?.feed ? undefined : (payload.from?.thread ?? event.thread),
        fresh: payload.mode === 'fresh' || payload.from?.feed !== undefined,
        seen: seenAt(state, payload.from),
        entries: [],
      });
    case 'turnBegin':
      return open(state, event.id, {
        parent: payload.from?.thread ?? event.thread,
        fresh: false,
        seen: seenAt(state, payload.from),
        entries: [],
      });
    case 'turnEnd': {
      const turn = live(state, payload.begin);
      return turn ? mergeInto(state, payload.begin, turn.entries) : state;
    }
    case 'threadMerge': {
      if (state.threads[payload.thread]?.closed) {
        return state;
      }

      const merged = state.threads[payload.thread]?.entries ?? [];
      return payload.mode === 'summary'
        ? mergeInto(state, payload.thread, [{ role: 'event', blocks: payload.summary ?? [], source: [event.id] }])
        : mergeInto(state, payload.thread, merged);
    }
    case 'threadClose':
      return live(state, payload.thread) ? { ...state, threads: end(state.threads, payload.thread) } : state;
    case 'compact':
      return event.thread === undefined ? { ...state, entries: compact(state, payload, event.id) } : state;
    default:
      return state;
  }
};
