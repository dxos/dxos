//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Events from './Events.ts';

/**
 * The folds every reader shares. The transcript the model is given, the transcript the UI renders
 * and the canvas the user looks at are all derived here from the same log, so a reload cannot
 * disagree with a live session about what happened.
 */

export type Turn = {
  readonly role: 'user' | 'assistant';
  readonly text: string;
};

/**
 * One row of the thread, in the order the turn produced it. Prose and code runs interleave here,
 * which `turns` cannot express: the thread shows each run at the point in the answer where the
 * agent made it.
 */
export type Item =
  | { readonly kind: 'user'; readonly id: string; readonly text: string }
  | {
      readonly kind: 'assistant';
      readonly id: string;
      readonly text: string;
      /** Still growing from deltas; cleared by its `AssistantMessage` or by the turn closing. */
      readonly streaming: boolean;
    }
  | {
      readonly kind: 'tool';
      readonly id: string;
      readonly code: string;
      readonly output?: string;
      readonly ok?: boolean;
    }
  | { readonly kind: 'notice'; readonly id: string; readonly text: string };

export type Presentation = {
  readonly seq: number;
  readonly kind: Events.PresentationKind;
  readonly title?: string;
  readonly content: string;
};

export type State = {
  readonly title: string;
  /** The prose of the conversation — what a chat view shows and a resumed prompt replays. */
  readonly turns: readonly Turn[];
  /** The thread as rendered: prose, partial prose and code runs, interleaved in turn order. */
  readonly items: readonly Item[];
  /** What the canvas shows. `CanvasCleared` empties it; the split screen opens once it is non-empty. */
  readonly canvas: readonly Presentation[];
  /**
   * Whether a turn is still in flight. Part of the fold rather than of any one client's local
   * state: a reload lands mid-turn, and a second tab watching the same project has to reach the
   * same answer as the tab that sent the prompt.
   */
  readonly running: boolean;
  /**
   * The ids of the turns opened and not yet closed; `running` is whether this is non-empty. Kept by
   * id so an end event closes only its own turn — a boolean would let any `TurnEnded` close
   * whichever turn happens to be open.
   */
  readonly openTurns: readonly string[];
  readonly seq: number;
};

export const empty: State = {
  title: 'Untitled',
  turns: [],
  items: [],
  canvas: [],
  running: false,
  openTurns: [],
  seq: 0,
};

/** A message written before turn ids existed opens a turn keyed by its own position. */
const openedTurnId = (entry: Events.Entry, turnId: string | undefined): string => turnId ?? `seq:${entry.seq}`;

/**
 * Closes `turnId` and every turn opened before it: turns run one at a time per project, so an
 * earlier turn still open by then was abandoned (a killed process writes no end event) and would
 * otherwise read as running forever. An end event for a turn not open closes nothing, and one
 * written before turn ids existed closes every open turn.
 */
const closeTurn = (state: State, turnId: string | undefined): Pick<State, 'running' | 'openTurns' | 'items'> => {
  const index = turnId === undefined ? state.openTurns.length - 1 : state.openTurns.indexOf(turnId);
  const openTurns = index < 0 ? state.openTurns : state.openTurns.slice(index + 1);
  const running = openTurns.length > 0;
  // A message whose turn closed without settling it (a crash, an interruption) stops reading as live.
  return { running, openTurns, items: running ? state.items : settleStreaming(state.items) };
};

const settleStreaming = (items: readonly Item[]): readonly Item[] =>
  items.some((item) => item.kind === 'assistant' && item.streaming)
    ? items.map((item) => (item.kind === 'assistant' && item.streaming ? { ...item, streaming: false } : item))
    : items;

/** The index of the message `messageId`, searched from the end since a delta targets the tail. */
const findMessage = (items: readonly Item[], messageId: string): number => {
  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    if (item.kind === 'assistant' && item.id === messageId) {
      return index;
    }
  }
  return -1;
};

const replaceAt = (items: readonly Item[], index: number, item: Item | undefined): readonly Item[] => [
  ...items.slice(0, index),
  ...(item ? [item] : []),
  ...items.slice(index + 1),
];

/** Grows the streaming message by one delta, opening it on the first. */
const appendDelta = (items: readonly Item[], event: Events.AssistantDelta): readonly Item[] => {
  const index = findMessage(items, event.messageId);
  const existing = index < 0 ? undefined : items[index];
  if (existing?.kind !== 'assistant') {
    return [...items, { kind: 'assistant', id: event.messageId, text: event.delta, streaming: true }];
  }
  return replaceAt(items, index, { ...existing, text: existing.text + event.delta });
};

/**
 * Settles a message: the final text replaces whatever its deltas assembled, since the agent trims
 * it. An empty final text removes the message — the deltas held only whitespace.
 */
const settleMessage = (items: readonly Item[], entry: Events.Entry, event: Events.AssistantMessage) => {
  const id = event.messageId ?? `seq:${entry.seq}`;
  const settled: Item | undefined =
    event.text.length > 0 ? { kind: 'assistant', id, text: event.text, streaming: false } : undefined;
  const index = event.messageId === undefined ? -1 : findMessage(items, event.messageId);
  if (index >= 0) {
    return replaceAt(items, index, settled);
  }
  return settled ? [...items, settled] : items;
};

/** Applies one entry. Unknown-to-the-fold events advance `seq` and change nothing else. */
export const apply = (state: State, entry: Events.Entry): State => {
  const seq = Math.max(state.seq, entry.seq);
  const event = entry.event;
  switch (event._tag) {
    case 'UserMessage':
      // A user message opens a turn; only a `TurnEnded` or `TurnFailed` with the same id closes it.
      return {
        ...state,
        seq,
        running: true,
        openTurns: [...state.openTurns, openedTurnId(entry, event.turnId)],
        turns: [...state.turns, { role: 'user', text: event.text }],
        items: [...state.items, { kind: 'user', id: `seq:${entry.seq}`, text: event.text }],
      };
    case 'AssistantDelta':
      // Only the thread sees a partial message; the prompt waits for the settled one.
      return { ...state, seq, items: appendDelta(state.items, event) };
    case 'AssistantMessage':
      return {
        ...state,
        seq,
        turns: event.text.length > 0 ? [...state.turns, { role: 'assistant', text: event.text }] : state.turns,
        items: settleMessage(state.items, entry, event),
      };
    case 'ToolCall':
      return {
        ...state,
        seq,
        items: [...state.items, { kind: 'tool', id: event.callId, code: event.code }],
      };
    case 'ToolResult':
      return {
        ...state,
        seq,
        items: state.items.map((item) =>
          item.kind === 'tool' && item.id === event.callId ? { ...item, output: event.output, ok: event.ok } : item,
        ),
      };
    case 'Presented':
      return {
        ...state,
        seq,
        canvas: [...state.canvas, { seq: entry.seq, kind: event.kind, title: event.title, content: event.content }],
      };
    case 'CanvasCleared':
      return { ...state, seq, canvas: [] };
    case 'TitleSet':
      return { ...state, seq, title: event.title };
    case 'StepRetried':
      // Shown, but the turn stays open: the agent is about to try again.
      return {
        ...state,
        seq,
        turns: [...state.turns, { role: 'assistant', text: `⚠ ${event.message} Retrying.` }],
        items: [...state.items, { kind: 'notice', id: `seq:${entry.seq}`, text: `⚠ ${event.message} Retrying.` }],
      };
    case 'TurnEnded':
      // A boundary marker; the transcript already holds everything the turn produced.
      return { ...state, seq, ...closeTurn(state, event.turnId) };
    case 'TurnFailed': {
      const closed = closeTurn(state, event.turnId);
      return {
        ...state,
        seq,
        ...closed,
        turns: [...state.turns, { role: 'assistant', text: `⚠ ${event.message}` }],
        items: [...closed.items, { kind: 'notice', id: `seq:${entry.seq}`, text: `⚠ ${event.message}` }],
      };
    }
  }
};

export const fold = (entries: readonly Events.Entry[], initial: State = empty): State => entries.reduce(apply, initial);
