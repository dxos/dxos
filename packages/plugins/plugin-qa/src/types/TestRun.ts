//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
// Person is referenced in Actor.Actor's inferred type; importing it keeps that type nameable.
import { Actor, type Person } from '@dxos/types';

import * as TestCase from './TestCase.ts';
import * as TestPlan from './TestPlan.ts';

/** What a run was executed against — structured, because this is what a reader filters on later. */
export const Target = Schema.Struct({
  /** Git sha, tag, or PR number. */
  ref: Schema.optional(Schema.String),
  branch: Schema.optional(Schema.String),
  /** Deployed app under test. */
  url: Schema.optional(Schema.String),
  env: Schema.optional(Schema.String),
});
export interface Target extends Schema.Schema.Type<typeof Target> {}

/**
 * A reference to evidence. Not a type of its own — the target is whatever the artifact already is
 * (Document, File, recording), so only the caption and kind live here.
 */
export const ArtifactRef = Schema.Struct({
  kind: Schema.Literals(['screenshot', 'video', 'log', 'document', 'other']),
  caption: Schema.optional(Schema.String),
  /** Whatever the artifact already is — a Document, a File, a recording. */
  target: Ref.Ref(Obj.Unknown),
});
export interface ArtifactRef extends Schema.Schema.Type<typeof ArtifactRef> {}

/**
 * A case the run set out to cover, captured at `startRun`. It holds the case's identity as well as
 * its key, so a `removeCase` mid-run cannot strand a result the rollup still counts.
 */
export const CapturedCase = Schema.Struct({
  key: Schema.String,
  case: Ref.Ref(TestCase.TestCase),
});
export interface CapturedCase extends Schema.Schema.Type<typeof CapturedCase> {}

/** Per-step outcome. Positional — index n corresponds to `TestCase.steps[n]`. */
export const StepResult = Schema.Struct({
  status: TestCase.ResultStatus,
  /** Why it failed, or the constraint that blocked it. */
  note: Schema.optional(Schema.String),
  artifacts: Schema.optional(Schema.mutable(Schema.Array(ArtifactRef))),
});
export interface StepResult extends Schema.Schema.Type<typeof StepResult> {}

/**
 * The outcome of one case within one run. An inline struct of `TestRun.results` — it has no life
 * outside its run and is never referenced from elsewhere, so it is not an object.
 */
export const Result = Schema.Struct({
  case: Ref.Ref(TestCase.TestCase),
  /** Denormalized from the case so a result reads without resolving the ref. */
  caseKey: Schema.String,
  status: TestCase.ResultStatus,
  steps: Schema.optional(Schema.mutable(Schema.Array(StepResult))),
  /** Failure summary, or the `blocked` reason. */
  note: Schema.optional(Schema.String),
  durationMs: Schema.optional(Schema.Number),
  artifacts: Schema.optional(Schema.mutable(Schema.Array(ArtifactRef))),
});
export interface Result extends Schema.Schema.Type<typeof Result> {}

/** One execution of a plan, appended to the plan's feed. */
export class TestRun extends Type.makeObject<TestRun>(DXN.make('org.dxos.type.qa.testRun', '0.1.0'))(
  Schema.Struct({
    plan: Ref.Ref(TestPlan.TestPlan),
    status: TestCase.Status,
    /**
     * The cases the run set out to cover, captured at `startRun`. The rollup and `pushResult`
     * validation both read this rather than the plan, so editing the plan mid-run cannot change
     * what the run was measured against — nor reject a result for a case it still counts.
     */
    cases: Schema.mutable(Schema.Array(CapturedCase)),
    target: Schema.optional(Target),
    /** Who ran it — a person or an agent, like any other actor in the system. */
    runner: Schema.optional(Actor.Actor),
    /** Which of before/test/after actually ran (QA dialect Rule 8). */
    stages: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
    startedAt: Schema.String,
    finishedAt: Schema.optional(Schema.String),
    results: Schema.mutable(Schema.Array(Result)),
    summary: Schema.optional(Schema.String),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--play-circle--regular', hue: 'green' })),
) {}

export const make = (props: Obj.MakeProps<typeof TestRun>): TestRun => Obj.make(TestRun, props);

export const instanceOf = (value: unknown): value is TestRun => Obj.instanceOf(TestRun, value);

/**
 * The rollup, over the captured case keys rather than over the results: a captured key with no
 * result counts as `skipped`, and an empty capture is `skipped` before precedence is consulted —
 * otherwise a run covering nothing would fall through to `passed`. So `passed` requires a
 * non-empty capture in which every case reported `passed`.
 */
export const rollup = (
  cases: readonly { readonly key: string }[],
  results: readonly Result[],
): TestCase.ResultStatus => {
  if (cases.length === 0) {
    return 'skipped';
  }

  const byKey = new Map(results.map((result) => [result.caseKey, result.status]));
  const statuses = cases.map(({ key }) => byKey.get(key) ?? 'skipped');
  for (const status of ['failed', 'blocked', 'skipped'] as const) {
    if (statuses.includes(status)) {
      return status;
    }
  }

  return 'passed';
};

/** Captured case keys that never received a result. */
export const unreported = (run: {
  readonly cases: readonly { readonly key: string }[];
  readonly results: readonly Result[];
}): string[] => {
  const reported = new Set(run.results.map((result) => result.caseKey));
  return run.cases.filter(({ key }) => !reported.has(key)).map(({ key }) => key);
};

/** Counts for the feed row: how many of the captured cases passed. */
export const tally = (run: {
  readonly cases: readonly unknown[];
  readonly results: readonly Result[];
}): { passed: number; total: number } => ({
  passed: run.results.filter((result) => result.status === 'passed').length,
  total: run.cases.length,
});

export type { Person };
