//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as HashMap from 'effect/HashMap';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as SchemaTransformation from 'effect/SchemaTransformation';

import { type Obj, type Ref } from '@dxos/echo';
import { ContentBlock } from '@dxos/types';

import * as Trajectory from './Trajectory.ts';
import * as Transcript from './Transcript.ts';

/**
 * A left fold over events in feed order; every view of a trajectory is one of these, so state after `n + k` events
 * is `step` applied `k` times to the state after `n`, and a reader never has to start from the first event.
 */
export interface Reducer<S> {
  readonly initial: S;
  readonly step: (state: S, event: Trajectory.Event) => S;
  /**
   * Folds a batch at once, equal to stepping each event; lets a reducer copy its state once per batch rather than once
   * per event, which keeps a long fold linear. The state passed in is never modified.
   */
  readonly fold?: (state: S, events: readonly Trajectory.Event[]) => S;
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
 * Folds `events` (the tail after `from.head`) onto a checkpoint, or onto the initial state.
 * Fold in local order (`Feed.getLocalCursor`): it never changes under a reader, so a checkpoint stays valid as sync
 * repositions the feed.
 */
export const run = <S>(
  reducer: Reducer<S>,
  events: Iterable<Trajectory.Event>,
  from?: Checkpoint<S>,
): Checkpoint<S> => {
  const batch = [...events];
  const initial = from?.state ?? reducer.initial;
  const state = reducer.fold
    ? reducer.fold(initial, batch)
    : batch.reduce((next, event) => reducer.step(next, event), initial);
  return { state, head: batch.at(-1)?.id ?? from?.head, count: (from?.count ?? 0) + batch.length };
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
   * cancelled it first; a harness claims a message by writing its consume and runs only if that consume is not listed
   * here.
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

const sessionFold: Reducer<SessionState> = {
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
        return { ...state, turns: [...state.turns, event.id], model: payload.model ?? state.model };
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

/** `rewound`: discarded by a rewind; kept so a reader can tell a message it already showed from a new one. */
export type ItemStatus = 'queued' | 'consumed' | 'cancelled' | 'sent' | 'rewound';

export type ThreadItem = {
  readonly id: Trajectory.EventId;
  readonly sender: Trajectory.Sender;
  readonly blocks: readonly ContentBlock.Any[];
  readonly created: string;
  /** Thread the message was written in; absent for the main thread. */
  readonly thread?: Trajectory.EventId;
  /** The lane the message belongs to: the top-level thread or turn its thread nests in; absent outside any. */
  readonly lane?: Trajectory.EventId;
  readonly status: ItemStatus;
};

export type LaneStatus = 'running' | 'waiting' | 'done' | 'failed';

/**
 * One top-level unit of work: a light (or other) thread opened on main, or a turn that runs on main. Several lanes
 * running at once are what the chat shows side by side.
 */
export type Lane = {
  readonly id: Trajectory.EventId;
  readonly kind: 'turn' | Trajectory.ThreadMode;
  readonly status: LaneStatus;
  readonly owner: Trajectory.Sender;
  readonly created: string;
  readonly purpose?: string;
  /** The lane this one is waiting for (`threadWait`). */
  readonly waitingOn?: Trajectory.EventId;
  /** Whether another lane was running at some point while this one was. */
  readonly overlapped?: boolean;
  /**
   * Whether a newer lane of the same owner opened while this one ran: the reader moved on to the newer request, so
   * this one works in the background from then on. Another owner's lane does not background it; agents talking to the
   * reader at once stay side by side. A delegated subagent (a `fresh` thread on main) is in the background from the
   * start.
   */
  readonly backgrounded?: boolean;
};

export type ThreadView = {
  readonly items: readonly ThreadItem[];
  /** In the order they opened. */
  readonly lanes: readonly Lane[];
  /** The lane of every thread and turn opened so far. */
  readonly laneOf: Readonly<Record<Trajectory.EventId, Trajectory.EventId>>;
};

/** `blocks` with the request the resolution answers settled; a request already settled keeps its first answer. */
const resolveRequest = (
  blocks: readonly ContentBlock.Any[],
  { requestId, resolution }: Trajectory.RequestResolve,
): readonly ContentBlock.Any[] =>
  blocks.map((block) =>
    block._tag === 'request' && block.requestId === requestId && block.resolution === undefined
      ? { ...block, resolution }
      : block,
  );

type MutableView = { items: ThreadItem[]; lanes: Lane[]; laneOf: Record<Trajectory.EventId, Trajectory.EventId> };

const isRunning = (lane: Lane) => lane.status === 'running' || lane.status === 'waiting';

const updateLane = (view: MutableView, id: Trajectory.EventId | undefined, update: (lane: Lane) => Lane): boolean => {
  const index = id === undefined ? -1 : view.lanes.findIndex((lane) => lane.id === id);
  if (index === -1) {
    return false;
  }
  view.lanes[index] = update(view.lanes[index]);
  return true;
};

/** Records a thread or turn opening: a lane of its own on main, or a member of its parent's lane. */
const openLane = (
  view: MutableView,
  event: Trajectory.Event,
  parent: Trajectory.EventId | undefined,
  lane: Omit<Lane, 'id' | 'status' | 'owner' | 'created'>,
): boolean => {
  if (parent !== undefined) {
    const parentLane = view.laneOf[parent];
    if (parentLane !== undefined) {
      view.laneOf[event.id] = parentLane;
      // A lane that runs another turn (after a wait, or for a queued prompt) is running again.
      updateLane(view, parentLane, (existing) => ({ ...existing, status: 'running', waitingOn: undefined }));
    }
    return parentLane !== undefined;
  }
  const running = view.lanes.filter(isRunning);
  for (const other of running) {
    const sameOwner = other.owner.name === event.sender.name;
    updateLane(view, other.id, (existing) => ({
      ...existing,
      overlapped: true,
      ...(sameOwner ? { backgrounded: true } : {}),
    }));
  }
  view.laneOf[event.id] = event.id;
  view.lanes.push({
    id: event.id,
    status: 'running',
    owner: event.sender,
    created: event.created,
    ...lane,
    ...(running.length > 0 ? { overlapped: true } : {}),
    // A fresh thread on main is a delegated subagent: the reader never asked it anything, so it works out of view.
    ...(lane.kind === 'fresh' ? { backgrounded: true } : {}),
  });
  return true;
};

const laneOfThread = (view: MutableView, thread: Trajectory.EventId | undefined) =>
  thread === undefined ? undefined : view.laneOf[thread];

/** Applies one event to the view, in place; `false` when the event leaves the view as it was. */
const applyThread = (view: MutableView, event: Trajectory.Event): boolean => {
  const items = view.items;
  const payload = event.payload;
  switch (payload._tag) {
    case 'message': {
      const lane = laneOfThread(view, event.thread);
      items.push({
        id: event.id,
        sender: event.sender,
        blocks: payload.blocks,
        created: event.created,
        thread: event.thread,
        ...(lane !== undefined ? { lane } : {}),
        status: event.sender.role === 'user' ? 'queued' : 'sent',
      });
      // A message after a wait means the lane is working again.
      updateLane(view, lane, (existing) =>
        existing.status === 'waiting' ? { ...existing, status: 'running', waitingOn: undefined } : existing,
      );
      return true;
    }
    case 'turnBegin':
      return openLane(view, event, payload.from?.thread ?? event.thread, { kind: 'turn' });
    case 'threadOpen':
      return openLane(view, event, payload.from?.feed ? undefined : (payload.from?.thread ?? event.thread), {
        kind: payload.mode,
        ...(payload.purpose !== undefined ? { purpose: payload.purpose } : {}),
      });
    case 'turnEnd':
      // A turn that is its own lane ends it; a turn inside a thread leaves the thread to its merge or close.
      return view.laneOf[payload.begin] === payload.begin
        ? updateLane(view, payload.begin, (lane) => ({
            ...lane,
            status: payload.finishReason === 'error' ? 'failed' : 'done',
            waitingOn: undefined,
          }))
        : false;
    case 'threadMerge':
    case 'threadClose': {
      const failed = payload._tag === 'threadClose' && payload.status !== 'completed';
      return view.laneOf[payload.thread] === payload.thread
        ? updateLane(view, payload.thread, (lane) => ({
            ...lane,
            status: failed ? 'failed' : 'done',
            waitingOn: undefined,
          }))
        : false;
    }
    case 'threadWait':
      return updateLane(view, laneOfThread(view, event.thread), (lane) => ({
        ...lane,
        status: 'waiting',
        waitingOn: view.laneOf[payload.on] ?? payload.on,
      }));
    case 'promptConsume': {
      // A second consume of the same message lost the claim, so the message stays where the first one put it.
      const index = items.findLastIndex((item) => item.id === payload.message && item.status === 'queued');
      if (index === -1) {
        return false;
      }
      const [item] = items.splice(index, 1);
      const lane = laneOfThread(view, event.thread);
      items.push({ ...item, thread: event.thread, ...(lane !== undefined ? { lane } : {}), status: 'consumed' });
      return true;
    }
    case 'requestResolve': {
      const index = items.findLastIndex((item) => item.id === payload.message);
      if (index === -1) {
        return false;
      }
      items[index] = { ...items[index], blocks: resolveRequest(items[index].blocks, payload) };
      return true;
    }
    case 'rewind': {
      const from = event.thread === undefined ? items.findIndex((item) => item.id === payload.from) : -1;
      for (let index = Math.max(from, 0); from !== -1 && index < items.length; index++) {
        if (items[index].status !== 'queued') {
          items[index] = { ...items[index], status: 'rewound' };
        }
      }
      return from !== -1;
    }
    case 'promptCancel': {
      const index = items.findLastIndex((item) => item.id === payload.message && item.status === 'queued');
      if (index === -1) {
        return false;
      }
      items[index] = { ...items[index], status: 'cancelled' };
      return true;
    }
    default:
      return false;
  }
};

/**
 * Every message, including turn threads still streaming; a user message moves to where it is consumed, the position
 * the model sees it at, and joins the consuming turn's thread. A consume or cancel whose message lies outside the loaded window is ignored, so the UI can
 * fold just the tail of a long conversation.
 */
const foldThread = (state: ThreadView, events: readonly Trajectory.Event[]): ThreadView => {
  const view: MutableView = { items: [...state.items], lanes: [...state.lanes], laneOf: { ...state.laneOf } };
  let changed = false;
  for (const event of events) {
    changed = applyThread(view, event) || changed;
  }
  return changed ? view : state;
};

const threadFold: Reducer<ThreadView> = {
  initial: { items: [], lanes: [], laneOf: {} },
  step: (state, event) => foldThread(state, [event]),
  fold: foldThread,
};

//
// Prompt: what the session process sends to the model.
//

export type PromptEntry = {
  readonly role: Trajectory.Role;
  /** The sender's name, which lets the model tell several people (or sources) apart. */
  readonly name?: string;
  readonly blocks: readonly ContentBlock.Any[];
  /** Events this entry was built from, so a later `compact` can find its range. */
  readonly source: readonly Trajectory.EventId[];
  /** Feed position of the event that placed the entry in its current buffer. */
  readonly at: number;
  /** A light thread's snapshot of the threads running beside it; dropped when the thread merges. */
  readonly ephemeral?: boolean;
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
  /** Title and owner a light thread's siblings see it by. */
  readonly purpose?: string;
  readonly owner?: string;
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
  /** Feed position of every folded event, to resolve a `from.event`; persistent, since a copy per event is quadratic. */
  readonly positions: HashMap.HashMap<Trajectory.EventId, number>;
  /**
   * Threads and turns that merged into a parent holding entries they never saw, with those entries' source events.
   * The merge still happens; whether to accept, re-run or correct is the harness's call.
   */
  readonly stale: Readonly<Record<Trajectory.EventId, readonly Trajectory.EventId[]>>;
  /** Conversation this feed continues (`fork`); its prompt up to `origin.event` precedes `entries`. */
  readonly origin?: Trajectory.ThreadOrigin;
};

const omit = <V>(record: Readonly<Record<string, V>>, key: string): Readonly<Record<string, V>> =>
  Object.fromEntries(Object.entries(record).filter(([other]) => other !== key));

/**
 * Entry arrays the running `fold` created, which nothing outside it holds yet, so it may push to them instead of
 * copying; `undefined` outside a fold, where every append copies.
 */
let owned: WeakMap<readonly PromptEntry[], PromptEntry[]> | undefined;

const grow = (entries: readonly PromptEntry[], entry: PromptEntry): readonly PromptEntry[] => {
  const mutable = owned?.get(entries);
  if (mutable) {
    mutable.push(entry);
    return mutable;
  }
  const copy = [...entries, entry];
  owned?.set(copy, copy);
  return copy;
};

const append = (
  state: PromptState,
  threadId: Trajectory.EventId | undefined,
  placed: Omit<PromptEntry, 'at'>,
): PromptState => {
  const entry: PromptEntry = { ...placed, at: state.position };
  if (threadId === undefined) {
    return { ...state, entries: grow(state.entries, entry) };
  }

  const buffer = state.threads[threadId] ?? { fresh: false, seen: state.position, entries: [] };
  return { ...state, threads: { ...state.threads, [threadId]: { ...buffer, entries: grow(buffer.entries, entry) } } };
};

/**
 * Closes a thread, appending `entries` to its parent; a parent that has already ended stands in for main.
 * A fresh thread never saw its parent, so only a fork or turn can be stale.
 */
const mergeInto = (state: PromptState, threadId: Trajectory.EventId, entries: readonly Omit<PromptEntry, 'at'>[]) => {
  const buffer = live(state, threadId);
  const parent = buffer?.parent;
  const target = parent !== undefined && live(state, parent) ? parent : undefined;
  const unseen = buffer && !buffer.fresh ? placedAfter(promptFor(state, target), buffer.seen) : [];
  return entries
    .filter((entry) => !entry.ephemeral)
    .reduce<PromptState>((next, entry) => append(next, target, entry), {
      ...state,
      threads: end(state.threads, threadId),
      stale: unseen.length > 0 ? { ...state.stale, [threadId]: unseen } : state.stale,
    });
};

/**
 * Source events of the entries placed after `position`. A prompt's entries are in placement order (a compaction
 * summary takes its range's earliest position), so the scan stops at the first entry placed at or before it.
 */
const placedAfter = (entries: readonly PromptEntry[], position: number): Trajectory.EventId[] => {
  let first = entries.length;
  while (first > 0 && entries[first - 1].at > position) {
    first--;
  }
  return entries.slice(first).flatMap((entry) => entry.source);
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
 * opener in local order) falls back to everything before the opener.
 */
const seenAt = (state: PromptState, origin?: Trajectory.ThreadOrigin) =>
  origin && !origin.feed
    ? Option.getOrElse(HashMap.get(state.positions, origin.event), () => state.position)
    : state.position;

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

/**
 * A thread's own entries and those of its open children, as a sibling sees them: placed at or before `seen`, in
 * placement order.
 */
const workOf = (state: PromptState, id: Trajectory.EventId, seen: number): PromptEntry[] => {
  const own = state.threads[id]?.entries ?? [];
  const children = Object.entries(state.threads).flatMap(([childId, buffer]) =>
    buffer.parent === id ? workOf(state, childId, seen) : [],
  );
  return [...own, ...children]
    .filter((entry) => entry.at <= seen && !entry.ephemeral)
    .sort((left, right) => left.at - right.at);
};

/** A turn's title when it has none of its own: the start of the request it answers. */
const titleOf = (entries: readonly PromptEntry[]): string | undefined => {
  const request = entries
    .find((entry) => entry.role === 'user')
    ?.blocks.flatMap((block) => (block._tag === 'text' ? [block.text] : []))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return request ? (request.length > 80 ? `${request.slice(0, 79)}…` : request) : undefined;
};

/**
 * Opens a light thread: a fork of main that starts with one entry holding the transcript of each running sibling.
 */
const openLight = (state: PromptState, event: Trajectory.Event, payload: Trajectory.ThreadOpen): PromptState => {
  const seen = seenAt(state, payload.from);
  const siblings = (payload.siblings ?? []).flatMap((id): Transcript.Thread[] => {
    const buffer = state.threads[id];
    if (!buffer) {
      return [];
    }
    const entries = workOf(state, id, seen);
    return [{ id, purpose: buffer.purpose ?? titleOf(entries), owner: buffer.owner, status: 'running', entries }];
  });
  const entries: PromptEntry[] =
    siblings.length > 0
      ? [
          {
            role: 'event',
            name: 'threads',
            blocks: [{ _tag: 'text', text: Transcript.snapshot(siblings, event.id) }],
            source: [event.id],
            at: state.position,
            ephemeral: true,
          },
        ]
      : [];
  return open(state, event.id, {
    fresh: false,
    seen,
    purpose: payload.purpose,
    owner: event.sender.name,
    entries,
  });
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
 * Builds the model prompt. Apart from `compact` and `rewind`, every event leaves `entries` as a prefix of what it was, which is
 * what keeps the provider's prompt cache valid from one request to the next.
 */
const stepPrompt = (state: PromptState, event: Trajectory.Event): PromptState => {
  const next = place(state, event);
  return { ...next, position: state.position + 1, positions: HashMap.set(next.positions, event.id, state.position) };
};

const promptFold: Reducer<PromptState> = {
  initial: { entries: [], held: {}, threads: {}, position: 0, positions: HashMap.empty(), stale: {} },
  step: stepPrompt,
  fold: (state, events) => {
    owned = new WeakMap();
    try {
      return events.reduce(stepPrompt, state);
    } finally {
      owned = undefined;
    }
  },
};

const place = (state: PromptState, event: Trajectory.Event): PromptState => {
  const payload = event.payload;
  switch (payload._tag) {
    case 'message': {
      const entry: PromptEntry = {
        role: event.sender.role,
        ...(event.sender.name !== undefined ? { name: event.sender.name } : {}),
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
      if (payload.mode === 'light') {
        return openLight(state, event, payload);
      }
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
    case 'rewind': {
      const from = state.entries.findIndex((entry) => entry.source.includes(payload.from));
      return event.thread === undefined && from !== -1 ? { ...state, entries: state.entries.slice(0, from) } : state;
    }
    case 'fork':
      return { ...state, origin: payload.from };
    case 'requestResolve': {
      const resolve = (entry: PromptEntry): PromptEntry =>
        entry.source.includes(payload.message) ? { ...entry, blocks: resolveRequest(entry.blocks, payload) } : entry;
      return {
        ...state,
        entries: state.entries.map(resolve),
        threads: Object.fromEntries(
          Object.entries(state.threads).map(([id, buffer]) => [
            id,
            { ...buffer, entries: buffer.entries.map(resolve) },
          ]),
        ),
      };
    }
    default:
      return state;
  }
};

//
// Durable: the reducers above, with a codec so a checkpoint can be stored and resumed.
//

/**
 * A reducer whose state can be stored, so a reader resumes from a saved checkpoint instead of refolding the feed.
 */
export interface Durable<S> extends Reducer<S> {
  /** Names the reducer and its state shape; a stored checkpoint under a different id is never read back. */
  readonly id: string;
  readonly schema: Schema.Codec<S, unknown>;
  /** Points decoded refs at a database, since a stored ref keeps its URI but not what resolves it. */
  readonly rebind?: (state: S, makeRef: MakeRef) => S;
}

export type MakeRef = <T extends Obj.Unknown>(ref: Ref.Ref<T>) => Ref.Ref<T>;

const EventIds = Schema.Array(Trajectory.EventId);

const SessionStateSchema = Schema.Struct({
  queue: EventIds,
  alarms: Schema.Array(
    Schema.Struct({ id: Trajectory.EventId, wakeAt: Schema.Number, message: Schema.optional(Schema.String) }),
  ),
  skills: Trajectory.ContextBind.fields.skills,
  objects: Trajectory.ContextBind.fields.objects,
  background: Schema.Array(Schema.Struct({ toolCallId: Schema.String, pid: Schema.optional(Schema.String) })),
  threads: Schema.Array(
    Schema.Struct({
      id: Trajectory.EventId,
      mode: Trajectory.ThreadMode,
      status: Schema.Literals(['open', 'merged', 'completed', 'failed', 'cancelled']),
    }),
  ),
  model: Schema.optional(Trajectory.ModelChange.fields.model),
  turns: EventIds,
  rejected: EventIds,
});

const ThreadViewSchema = Schema.Struct({
  items: Schema.Array(
    Schema.Struct({
      id: Trajectory.EventId,
      sender: Trajectory.Sender,
      blocks: Schema.Array(ContentBlock.Any),
      created: Schema.String,
      thread: Schema.optional(Trajectory.EventId),
      lane: Schema.optional(Trajectory.EventId),
      status: Schema.Literals(['queued', 'consumed', 'cancelled', 'sent', 'rewound']),
    }),
  ),
  lanes: Schema.Array(
    Schema.Struct({
      id: Trajectory.EventId,
      kind: Schema.Literals(['turn', 'fork', 'fresh', 'light']),
      status: Schema.Literals(['running', 'waiting', 'done', 'failed']),
      owner: Trajectory.Sender,
      created: Schema.String,
      purpose: Schema.optional(Schema.String),
      waitingOn: Schema.optional(Trajectory.EventId),
      overlapped: Schema.optional(Schema.Boolean),
      backgrounded: Schema.optional(Schema.Boolean),
    }),
  ),
  laneOf: Schema.Record(Trajectory.EventId, Trajectory.EventId),
});

const PromptEntrySchema = Schema.Struct({
  role: Trajectory.Role,
  name: Schema.optional(Schema.String),
  blocks: Schema.Array(ContentBlock.Any),
  source: EventIds,
  at: Schema.Number,
  ephemeral: Schema.optional(Schema.Boolean),
});

const PromptStateSchema = Schema.Struct({
  entries: Schema.Array(PromptEntrySchema),
  held: Schema.Record(Schema.String, PromptEntrySchema),
  threads: Schema.Record(
    Schema.String,
    Schema.Struct({
      parent: Schema.optional(Trajectory.EventId),
      fresh: Schema.Boolean,
      seen: Schema.Number,
      closed: Schema.optional(Schema.Boolean),
      purpose: Schema.optional(Schema.String),
      owner: Schema.optional(Schema.String),
      entries: Schema.Array(PromptEntrySchema),
    }),
  ),
  position: Schema.Number,
  positions: Schema.Record(Trajectory.EventId, Schema.Number).pipe(
    Schema.decodeTo(
      Schema.HashMap(Trajectory.EventId, Schema.Number),
      SchemaTransformation.transform({
        decode: (record) => HashMap.fromIterable(Object.entries(record)),
        encode: (positions) => Object.fromEntries(positions),
      }),
    ),
  ),
  stale: Schema.Record(Schema.String, EventIds),
  origin: Schema.optional(Trajectory.ThreadOrigin),
});

export const session: Durable<SessionState> = {
  ...sessionFold,
  id: 'session@1',
  schema: SessionStateSchema,
  rebind: (state, makeRef) => ({
    ...state,
    skills: state.skills.map((ref) => makeRef(ref)),
    objects: state.objects.map((ref) => makeRef(ref)),
  }),
};

export const thread: Durable<ThreadView> = { ...threadFold, id: 'thread@3', schema: ThreadViewSchema };

export const prompt: Durable<PromptState> = {
  ...promptFold,
  id: 'prompt@1',
  schema: PromptStateSchema,
  rebind: (state, makeRef) =>
    state.origin?.feed ? { ...state, origin: { ...state.origin, feed: makeRef(state.origin.feed) } } : state,
};
