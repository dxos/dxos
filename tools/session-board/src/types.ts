//
// Copyright 2026 DXOS.org
//

/** The data `cli.ts build` writes into the page; the page renders it without parsing anything. */
export const BOARD_FORMAT = 'session-board@1';

/** One run of inline text: plain, code, bold, or a link. */
export type Span = {
  text: string;
  code?: boolean;
  strong?: boolean;
  href?: string;
};

/** A detail bullet under an item, with at most one level of sub-bullets. */
export type Detail = {
  spans: Span[];
  children?: Detail[];
};

/** How a section's states read and look. `list` sections take any state, or none. */
export type SectionKind = 'questions' | 'goals' | 'prs' | 'list';

export type Item = {
  /** A word from the section's state vocabulary (`STATES`). */
  state?: string;
  /** The one terse line the board shows collapsed. */
  spans: Span[];
  details: Detail[];
};

export type Section = {
  id: string;
  title: string;
  kind: SectionKind;
  items: Item[];
};

export type BoardData = {
  format: typeof BOARD_FORMAT;
  title: string;
  summary?: Span[];
  /** ISO time of the build. */
  updated: string;
  branch?: string;
  /** Repo path of the Markdown source. */
  source?: string;
  sections: Section[];
};

/** How one state looks; the hues are react-ui `Tag` hues. */
export type StateStyle = {
  hue: 'neutral' | 'info' | 'success' | 'warning' | 'error' | 'violet';
  /** True when the state counts as finished in the section's tally. */
  closed?: boolean;
};

const TODO: StateStyle = { hue: 'neutral' };
const DOING: StateStyle = { hue: 'info' };
const DONE: StateStyle = { hue: 'success', closed: true };
const BLOCKED: StateStyle = { hue: 'error' };
const DROPPED: StateStyle = { hue: 'neutral', closed: true };

const GOAL_STATES = { todo: TODO, doing: DOING, done: DONE, blocked: BLOCKED, dropped: DROPPED };

/** The states each kind of section accepts. */
export const STATES: Record<SectionKind, Record<string, StateStyle>> = {
  questions: {
    open: { hue: 'warning' },
    answered: { hue: 'success', closed: true },
  },
  goals: GOAL_STATES,
  prs: {
    draft: { hue: 'neutral' },
    open: { hue: 'info' },
    failing: { hue: 'error' },
    queued: { hue: 'warning' },
    merged: { hue: 'violet', closed: true },
    closed: { hue: 'neutral', closed: true },
  },
  list: GOAL_STATES,
};

/** Section headings that select a kind; any other heading is a `list`. */
export const SECTION_KINDS: Record<string, SectionKind> = {
  'questions': 'questions',
  'goals': 'goals',
  'pull requests': 'prs',
  'prs': 'prs',
};
