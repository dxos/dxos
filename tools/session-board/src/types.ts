//
// Copyright 2026 DXOS.org
//

/** The data `cli.ts build` writes into the page from a `SESSION.mdl`; the page renders it without parsing. */
export const BOARD_FORMAT = 'session-board@2';

/** The goal states, which are the task statuses of `@dxos/types`, so a goal draws as a task does. */
export const GOAL_STATUSES = [
  'todo',
  'backlog',
  'started',
  'review',
  'done',
  'duplicate',
  'blocked',
  'cancelled',
  'failed',
] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

/** `landing` means the `land` skill drives the PR until the merge queue takes it (`queued`). */
export const PR_STATUSES = ['draft', 'open', 'failing', 'landing', 'queued', 'merged', 'closed'] as const;

export type PrStatus = (typeof PR_STATUSES)[number];

export type QuestionOption = { title: string; description?: string };

/** A `question Q-n` block, with the `decision` that answers it, if any. */
export type Question = {
  id: string;
  text: string;
  context?: string;
  options: QuestionOption[];
  answer?: string;
};

/** A `goal G-n` block; `blocked` is true while a question it names in `blockedBy` is open. */
export type Goal = {
  id: string;
  title: string;
  status: GoalStatus;
  blockedBy: string[];
  blocked: boolean;
  notes: string[];
  /** The Composer task the goal mirrors, as an `echo:` URI; `cli.ts tasks` keeps its status in step. */
  task?: string;
  /** The Composer URL that opens `task`, for the row's open button. */
  taskUrl?: string;
};

/** A `pr PR-n` block. */
export type PullRequest = {
  id: string;
  title: string;
  ref: string;
  url: string;
  status: PrStatus;
  branch?: string;
  notes: string[];
};

/** An `event T-n` block of the append-only timeline. */
export type TimelineEvent = {
  id: string;
  title: string;
  date: string;
  by?: string;
};

export type BoardData = {
  format: typeof BOARD_FORMAT;
  title: string;
  summary?: string;
  /** ISO time of the build. */
  updated: string;
  /** Repo path of the `SESSION.mdl`. */
  source?: string;
  questions: Question[];
  goals: Goal[];
  prs: PullRequest[];
  timeline: TimelineEvent[];
};

/** A viewer turned landing on or off for a PR; `element` is the PR's row, which the request is anchored to. */
export type LandChangeHandler = (pr: PullRequest, land: boolean, element: Element) => void | Promise<void>;
