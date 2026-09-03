//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import * as Operation from '@dxos/compute/Operation';
import { Database, DXN, Ref, Tag } from '@dxos/echo';
// Person is referenced in Actor.Actor's inferred type; importing it keeps that type nameable.
import { Actor, type Person } from '@dxos/types';

import * as TestCase from './TestCase';
import * as TestPlan from './TestPlan';
import * as TestRun from './TestRun';

export const CreatePlan = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.qa.createPlan'),
    name: 'Create test plan',
    description: 'Creates a test plan with its run feed.',
    icon: 'ph--check-square-offset--regular',
  },
  input: Schema.Struct({
    name: Schema.String,
    description: Schema.optional(Schema.String),
    /** The spec document this plan tracks. */
    source: Schema.optional(Schema.String),
    target: Database.Database.annotate({ description: 'The database to create the plan in.' }),
  }),
  output: Schema.Struct({
    plan: Ref.Ref(TestPlan.TestPlan),
  }),
});

export const SetCase = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.qa.setCase'),
    name: 'Upsert test case',
    description: 'Creates or updates a case by key within a plan, appending it when new.',
    icon: 'ph--check-square--regular',
  },
  input: Schema.Struct({
    plan: Ref.Ref(TestPlan.TestPlan),
    /** Matching on the human key rather than the id is what makes re-generation non-destructive. */
    key: Schema.String,
    title: Schema.String,
    description: Schema.optional(Schema.String),
    steps: Schema.optional(Schema.Array(TestCase.Step)),
    /** Tag objects to set in the case's ECHO meta — tags are not a field on the case. */
    tags: Schema.optional(Schema.Array(Ref.Ref(Tag.Tag))),
  }),
  output: Schema.Struct({
    case: Ref.Ref(TestCase.TestCase),
    created: Schema.Boolean,
  }),
  services: [Database.Service],
});

export const RemoveCase = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.qa.removeCase'),
    name: 'Remove test case',
    description: 'Removes a case from a plan. Past results still reference the case object.',
    icon: 'ph--minus-circle--regular',
  },
  input: Schema.Struct({
    plan: Ref.Ref(TestPlan.TestPlan),
    key: Schema.String,
  }),
  output: Schema.Struct({
    removed: Schema.Boolean,
  }),
  services: [Database.Service],
});

export const SetCaseOrder = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.qa.setCaseOrder'),
    name: 'Reorder test cases',
    description: "Sets the plan's case ordering.",
    icon: 'ph--sort-ascending--regular',
  },
  input: Schema.Struct({
    plan: Ref.Ref(TestPlan.TestPlan),
    /** The full ordering; a key not in the plan is an error. */
    keys: Schema.Array(Schema.String),
  }),
  output: Schema.Struct({
    plan: Ref.Ref(TestPlan.TestPlan),
  }),
  services: [Database.Service],
});

export const StartRun = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.qa.startRun'),
    name: 'Start test run',
    description: "Appends a running TestRun to the plan's feed, capturing the cases it covers.",
    icon: 'ph--play-circle--regular',
  },
  input: Schema.Struct({
    plan: Ref.Ref(TestPlan.TestPlan),
    /** Case keys to cover; defaults to the plan's full case list. */
    cases: Schema.optional(Schema.Array(Schema.String)),
    target: Schema.optional(TestRun.Target),
    runner: Schema.optional(Actor.Actor),
    stages: Schema.optional(Schema.Array(Schema.String)),
  }),
  output: Schema.Struct({
    run: Ref.Ref(TestRun.TestRun),
    cases: Schema.Array(Schema.String),
  }),
  services: [Database.Service],
});

export const PushResult = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.qa.pushResult'),
    name: 'Push test result',
    description: 'Appends (or replaces, by case key) one result on a running run.',
    icon: 'ph--upload-simple--regular',
  },
  input: Schema.Struct({
    run: Ref.Ref(TestRun.TestRun),
    caseKey: Schema.String,
    status: TestCase.ResultStatus,
    steps: Schema.optional(Schema.Array(TestRun.StepResult)),
    note: Schema.optional(Schema.String),
    durationMs: Schema.optional(Schema.Number),
    artifacts: Schema.optional(Schema.Array(TestRun.ArtifactRef)),
  }),
  output: Schema.Struct({
    run: Ref.Ref(TestRun.TestRun),
    status: TestCase.Status,
  }),
  services: [Database.Service],
});

export const CompleteRun = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.qa.completeRun'),
    name: 'Finish test run',
    description: 'Rolls up the status over the captured cases, stamps finishedAt, and seals the run.',
    icon: 'ph--flag-checkered--regular',
  },
  input: Schema.Struct({
    run: Ref.Ref(TestRun.TestRun),
    summary: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    run: Ref.Ref(TestRun.TestRun),
    status: TestCase.Status,
    /** Captured case keys that never received a result. */
    unreported: Schema.Array(Schema.String),
  }),
  services: [Database.Service],
});

export const QueryRuns = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.qa.queryRuns'),
    name: 'Query test runs',
    description: "Reads the plan's feed, newest-first.",
    icon: 'ph--list-magnifying-glass--regular',
  },
  input: Schema.Struct({
    plan: Ref.Ref(TestPlan.TestPlan),
    limit: Schema.optional(Schema.Number),
    status: Schema.optional(TestCase.Status),
    /** Runs containing a result for this case. */
    caseKey: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    runs: Schema.Array(Ref.Ref(TestRun.TestRun)),
  }),
  services: [Database.Service],
});

export const GetCaseHistory = Operation.make({
  meta: {
    key: DXN.make('org.dxos.operation.qa.getCaseHistory'),
    name: 'Test case history',
    description: "One case's status across runs, newest-first.",
    icon: 'ph--clock-counter-clockwise--regular',
  },
  input: Schema.Struct({
    plan: Ref.Ref(TestPlan.TestPlan),
    caseKey: Schema.String,
    limit: Schema.optional(Schema.Number),
  }),
  output: Schema.Struct({
    entries: Schema.Array(
      Schema.Struct({
        run: Ref.Ref(TestRun.TestRun),
        status: TestCase.ResultStatus,
        target: Schema.optional(TestRun.Target),
        at: Schema.String,
      }),
    ),
  }),
  services: [Database.Service],
});

export type { Person };
