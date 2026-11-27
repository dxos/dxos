//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { type Fact } from '@dxos/echo-memory';

//
// Facts.
//

export const FactKind = Schema.Literals(['statement', 'question', 'request']);
export type FactKind = Schema.Schema.Type<typeof FactKind>;

/** A fact's kind, read from its illocution: absent or assertive is a statement, a directive a question or a request. */
export const kindOf = (fact: Fact.Fact): FactKind =>
  fact.illocution?.force !== 'directive'
    ? 'statement'
    : fact.illocution.mood === 'interrogative'
      ? 'question'
      : 'request';

//
// Evidence.
//

/** One headed section of a canonical document. */
export const Passage = Schema.Struct({
  /** The document's URI. */
  document: Schema.String,
  title: Schema.String,
  heading: Schema.String,
  text: Schema.String,
});
export interface Passage extends Schema.Schema.Type<typeof Passage> {}

/** A passage offered as support for a question. */
export const Evidence = Schema.Struct({
  passage: Passage,
  /** The question's topics that the passage's document is about. */
  topics: Schema.Array(Schema.String),
  /** The share of the question's terms the passage contains, 0..1. */
  coverage: Schema.Number,
});
export interface Evidence extends Schema.Schema.Type<typeof Evidence> {}

/** What a draft cites: the document, the section, and the text relied on. */
export const Citation = Schema.Struct({
  document: Schema.String,
  title: Schema.String,
  heading: Schema.String,
  quote: Schema.String,
});
export interface Citation extends Schema.Schema.Type<typeof Citation> {}

//
// Decisions.
//

export const TaskReason = Schema.Literals(['request', 'no-evidence', 'low-confidence', 'research-failed']);
export type TaskReason = Schema.Schema.Type<typeof TaskReason>;

export const DraftDecision = Schema.Struct({
  kind: Schema.Literal('draft'),
  confidence: Schema.Number,
  /** Non-empty, so a draft with nothing to cite cannot be built. */
  citations: Schema.NonEmptyArray(Citation),
});
export interface DraftDecision extends Schema.Schema.Type<typeof DraftDecision> {}

export const TaskDecision = Schema.Struct({
  kind: Schema.Literal('task'),
  confidence: Schema.Number,
  reason: TaskReason,
});
export interface TaskDecision extends Schema.Schema.Type<typeof TaskDecision> {}

/** The outcome for one question or request. */
export const Decision = Schema.Union([DraftDecision, TaskDecision]);
export type Decision = Schema.Schema.Type<typeof Decision>;

//
// Pipeline progress.
//

export const StageId = Schema.Literals(['ingest', 'entities', 'facts', 'research', 'respond', 'triage']);
export type StageId = Schema.Schema.Type<typeof StageId>;

/** The stages in the order they run. */
export const STAGES: readonly StageId[] = StageId.literals;

/** The four values of `StatusListStatus` in `@dxos/react-ui-list`. */
export const StageStatus = Schema.Literals(['not-started', 'working', 'success', 'failed']);
export type StageStatus = Schema.Schema.Type<typeof StageStatus>;

export const StageRun = Schema.Struct({
  id: StageId,
  status: StageStatus,
  /** What the stage did, or why it failed. */
  detail: Schema.optional(Schema.String),
});
export interface StageRun extends Schema.Schema.Type<typeof StageRun> {}

/** One message's progress through the pipeline. */
export const MessageRun = Schema.Struct({
  /** The message's id. */
  message: Schema.String,
  title: Schema.String,
  stages: Schema.Array(StageRun),
});
export interface MessageRun extends Schema.Schema.Type<typeof MessageRun> {}

/** A run with every stage waiting. */
export const makeRun = (message: string, title: string): MessageRun => ({
  message,
  title,
  stages: STAGES.map((id) => ({ id, status: 'not-started' })),
});

/** The run with one stage's status replaced. */
export const withStage = (run: MessageRun, stage: StageRun): MessageRun => ({
  ...run,
  stages: run.stages.map((current) => (current.id === stage.id ? stage : current)),
});
