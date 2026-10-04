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
  /** Every code run, in order, with whatever the sandbox returned. */
  readonly calls: readonly {
    readonly callId: string;
    readonly code: string;
    readonly output?: string;
    readonly ok?: boolean;
  }[];
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
  calls: [],
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
const closeTurn = (state: State, turnId: string | undefined): Pick<State, 'running' | 'openTurns'> => {
  if (turnId === undefined) {
    return { running: false, openTurns: [] };
  }
  const index = state.openTurns.indexOf(turnId);
  const openTurns = index < 0 ? state.openTurns : state.openTurns.slice(index + 1);
  return { running: openTurns.length > 0, openTurns };
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
      };
    case 'AssistantMessage':
      return { ...state, seq, turns: [...state.turns, { role: 'assistant', text: event.text }] };
    case 'ToolCall':
      return { ...state, seq, calls: [...state.calls, { callId: event.callId, code: event.code }] };
    case 'ToolResult':
      return {
        ...state,
        seq,
        calls: state.calls.map((call) =>
          call.callId === event.callId ? { ...call, output: event.output, ok: event.ok } : call,
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
    case 'TurnEnded':
      // A boundary marker; the transcript already holds everything the turn produced.
      return { ...state, seq, ...closeTurn(state, event.turnId) };
    case 'TurnFailed':
      return {
        ...state,
        seq,
        ...closeTurn(state, event.turnId),
        turns: [...state.turns, { role: 'assistant', text: `⚠ ${event.message}` }],
      };
  }
};

export const fold = (entries: readonly Events.Entry[], initial: State = empty): State => entries.reduce(apply, initial);
