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
  /** The `turnBegin` of a turn that has not ended. */
  readonly turn?: Trajectory.EventId;
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
  initial: { queue: [], alarms: [], skills: [], objects: [], background: [], threads: [] },
  step: (state, event) => {
    const payload = event.payload;
    switch (payload._tag) {
      case 'message':
        return event.sender.role === 'user' ? { ...state, queue: [...state.queue, event.id] } : state;
      case 'promptConsume':
      case 'promptCancel':
        return { ...state, queue: state.queue.filter((id) => id !== payload.message) };
      case 'turnBegin':
        return { ...state, turn: event.id, model: payload.model };
      case 'turnEnd':
        return state.turn === payload.begin ? { ...state, turn: undefined } : state;
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

/**
 * Every message in feed order, including turn threads still streaming; a consume or cancel whose message lies
 * outside the loaded window is ignored, so the UI can fold just the tail of a long conversation.
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
        return { items: setItemStatus(state.items, payload.message, 'consumed') };
      case 'promptCancel':
        return { items: setItemStatus(state.items, payload.message, 'cancelled') };
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
};

export type PromptState = {
  /** The main thread's prompt; only appended to, except by `compact`. */
  readonly entries: readonly PromptEntry[];
  /** User messages waiting for a `promptConsume`. */
  readonly held: Readonly<Record<Trajectory.EventId, PromptEntry>>;
  /** Entries written in each open thread, spliced into `entries` by a raw `threadMerge`. */
  readonly threads: Readonly<Record<Trajectory.EventId, readonly PromptEntry[]>>;
};

const omit = <V>(record: Readonly<Record<string, V>>, key: string): Readonly<Record<string, V>> =>
  Object.fromEntries(Object.entries(record).filter(([other]) => other !== key));

const append = (state: PromptState, threadId: Trajectory.EventId | undefined, entry: PromptEntry): PromptState =>
  threadId === undefined
    ? { ...state, entries: [...state.entries, entry] }
    : { ...state, threads: { ...state.threads, [threadId]: [...(state.threads[threadId] ?? []), entry] } };

const compact = (entries: readonly PromptEntry[], payload: Trajectory.Compact, id: Trajectory.EventId) => {
  const first = entries.findIndex((entry) => entry.source.includes(payload.from));
  const last = entries.findLastIndex((entry) => entry.source.includes(payload.to));
  if (last === -1) {
    return entries;
  }

  // A range that starts before the loaded checkpoint is folded from the start of what is held.
  const start = first === -1 ? 0 : first;
  const summary: PromptEntry = { role: 'event', blocks: payload.summary, source: [id] };
  return [...entries.slice(0, start), summary, ...entries.slice(last + 1)];
};

/**
 * Builds the model prompt. Apart from `compact`, every event leaves `entries` as a prefix of what it was, which is
 * what keeps the provider's prompt cache valid from one request to the next.
 */
export const prompt: Reducer<PromptState> = {
  initial: { entries: [], held: {}, threads: {} },
  step: (state, event) => {
    const payload = event.payload;
    switch (payload._tag) {
      case 'message': {
        const entry: PromptEntry = { role: event.sender.role, blocks: payload.blocks, source: [event.id] };
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
        return { ...state, threads: { ...state.threads, [event.id]: [] } };
      case 'threadMerge': {
        const merged = state.threads[payload.thread] ?? [];
        const threads = omit(state.threads, payload.thread);
        if (payload.mode === 'summary') {
          const summary: PromptEntry = { role: 'event', blocks: payload.summary ?? [], source: [event.id] };
          return append({ ...state, threads }, event.thread, summary);
        }

        return merged.reduce<PromptState>((next, entry) => append(next, event.thread, entry), { ...state, threads });
      }
      case 'threadClose':
        return { ...state, threads: omit(state.threads, payload.thread) };
      case 'compact':
        return event.thread === undefined ? { ...state, entries: compact(state.entries, payload, event.id) } : state;
      default:
        return state;
    }
  },
};
