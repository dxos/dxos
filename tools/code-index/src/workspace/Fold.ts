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
  readonly seq: number;
};

export const empty: State = { title: 'Untitled', turns: [], calls: [], canvas: [], running: false, seq: 0 };

/** Applies one entry. Unknown-to-the-fold events advance `seq` and change nothing else. */
export const apply = (state: State, entry: Events.Entry): State => {
  const seq = Math.max(state.seq, entry.seq);
  const event = entry.event;
  switch (event._tag) {
    case 'UserMessage':
      // A user message opens a turn; only `TurnEnded` or `TurnFailed` closes one.
      return { ...state, seq, running: true, turns: [...state.turns, { role: 'user', text: event.text }] };
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
      return { ...state, seq, running: false };
    case 'TurnFailed':
      return {
        ...state,
        seq,
        running: false,
        turns: [...state.turns, { role: 'assistant', text: `⚠ ${event.message}` }],
      };
  }
};

export const fold = (entries: readonly Events.Entry[], initial: State = empty): State => entries.reduce(apply, initial);
