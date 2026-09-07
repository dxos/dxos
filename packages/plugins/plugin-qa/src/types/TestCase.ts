//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/Annotation';

/**
 * A terminal outcome — the only thing a case or a step can be reported as. `blocked` is distinct
 * from `failed`: nothing was tested, so it must not be counted as a defect.
 */
export const ResultStatus = Schema.Literals(['passed', 'failed', 'skipped', 'blocked']);
export type ResultStatus = Schema.Schema.Type<typeof ResultStatus>;

/**
 * A run's status: any terminal outcome, or `running` while it is open. `running` is deliberately
 * absent from {@link ResultStatus} — a case result that could be `running` would count as
 * non-failing in the rollup, letting a run seal as `passed` with nothing actually finished.
 */
export const Status = Schema.Literals([...ResultStatus.literals, 'running']);
export type Status = Schema.Schema.Type<typeof Status>;

/** One move in a case — the authored instruction and its criterion. Mirrors `step` in the QA dialect. */
export const Step = Schema.Struct({
  /** Stable handle; steps are otherwise numbered by position from 1. */
  id: Schema.optional(Schema.String),
  /** The human instruction. */
  do: Schema.String,
  /** The criterion both a human and an agent judge. */
  expect: Schema.String,
});
export interface Step extends Schema.Schema.Type<typeof Step> {}

/**
 * The definition of one test. Static — an execution never writes here, which is what lets results
 * across months of runs point at one identity.
 *
 * No `tags` field: ECHO carries tags in every object's meta (`Obj.getMeta(case).tags`), so a
 * QA-local string array would be a second tagging system the rest of Composer cannot see.
 */
export class TestCase extends Type.makeObject<TestCase>(DXN.make('org.dxos.type.qa.testCase', '0.1.0'))(
  Schema.Struct({
    /** Stable human id, e.g. "QA-3"; unique within a plan. */
    key: Schema.String.pipe(Schema.annotate({ title: 'Key' })),
    title: Schema.String.pipe(Schema.annotate({ title: 'Title' })),
    description: Schema.optional(Schema.String),
    steps: Schema.mutable(Schema.Array(Step)),
    /** The spec this case was authored from (a PLUGIN.mdl document). */
    source: Schema.optional(Schema.String),
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-square--regular', hue: 'green' }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof TestCase>): TestCase => Obj.make(TestCase, props);

export const instanceOf = (value: unknown): value is TestCase => Obj.instanceOf(TestCase, value);
