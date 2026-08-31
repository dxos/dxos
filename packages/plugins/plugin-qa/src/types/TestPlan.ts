//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Feed, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as TestCase from './TestCase';

/** Root object and the surface the UI opens: the ordered cases, plus the feed of executions. */
export class TestPlan extends Type.makeObject<TestPlan>(DXN.make('org.dxos.type.qa.testPlan', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.annotate({ title: 'Name' })),
    description: Schema.optional(Schema.String),
    /** Ordered; the plan owns the ordering, the case does not. */
    cases: Schema.mutable(Schema.Array(Ref.Ref(TestCase.TestCase))).pipe(FormInputAnnotation.set(false)),
    /** Durable append-only log of executions; a child of the plan, so it cascade-deletes with it. */
    feed: Ref.Ref(Feed.Feed).pipe(Annotation.SetParent.set(true), FormInputAnnotation.set(false)),
    /** The `## QA` section this plan tracks, when generated from a spec. */
    source: Schema.optional(Schema.String),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-square-offset--regular', hue: 'green' }),
  ),
) {}

/** Props a caller supplies; the feed and the empty case list are the plan's own to create. */
export const CreateTestPlanSchema = Schema.Struct({
  name: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Name' }))),
  description: Schema.optional(Schema.String.pipe(Schema.annotate({ title: 'Description' }))),
  /** The spec document this plan tracks, when generated from one. */
  source: Schema.optional(Schema.String),
});
export interface CreateTestPlanProps extends Schema.Schema.Type<typeof CreateTestPlanSchema> {}

/** Creates a plan with its backing feed. */
export const make = ({ name, description, source }: CreateTestPlanProps = {}): TestPlan =>
  Obj.make(TestPlan, {
    name: name ?? 'New test plan',
    description,
    source,
    cases: [],
    feed: Ref.make(Feed.make({ kind: 'org.dxos.plugin.qa' })),
  });

export const instanceOf = (value: unknown): value is TestPlan => Obj.instanceOf(TestPlan, value);
